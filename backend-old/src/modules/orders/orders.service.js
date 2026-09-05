const repo = require('./orders.repository');
const carrierClient = require('../../lib/carrierClient');
const AppError = require('../../lib/AppError');

const CACHE_TTL_MS = 60_000;

function isFresh(cachedAt) {
  return Date.now() - new Date(cachedAt).getTime() < CACHE_TTL_MS;
}

// Dedupes concurrent cache refreshes for the same order (M-1: "thundering
// herd"). Without this, N simultaneous requests for the same stale order
// each independently call the upstream carrier and each run their own
// delete+recreate transaction — redundant upstream load, and a window where
// a concurrent read can observe a momentarily-empty items/trackingEvents
// list mid-refresh. In-process is enough at single-instance scale; if this
// runs multi-instance, the dedup key would need to move to something shared
// (e.g. a Postgres advisory lock), same as the rate-limiter store (H-4).
const inFlightRefreshes = new Map();

/**
 * Read-through cache: serve from Postgres if fresh, otherwise hit the
 * upstream carrier/order system and refresh the cache. The caller
 * (controller) doesn't know or care which path was taken.
 */
async function getCachedOrRefresh(externalOrderId) {
  const cached = await repo.findByExternalId(externalOrderId);
  if (cached && isFresh(cached.cachedAt)) return cached;

  const existing = inFlightRefreshes.get(externalOrderId);
  if (existing) return existing;

  const refreshPromise = (async () => {
    const upstream = await carrierClient.fetchOrder(externalOrderId); // throws AppError.notFound if missing
    return repo.upsertFromUpstream(externalOrderId, upstream);
  })();

  inFlightRefreshes.set(externalOrderId, refreshPromise);
  try {
    return await refreshPromise;
  } finally {
    inFlightRefreshes.delete(externalOrderId);
  }
}

/**
 * Authorization + audit logging live here, not in the controller, so every
 * caller of this service gets the same rules regardless of route.
 *
 * - CUSTOMER actor: must supply the matching email, or gets a 403 (order
 *   exists but isn't theirs) — never a leaky "not found" that would let
 *   someone distinguish "wrong ID" from "wrong email" by response shape... actually
 *   we deliberately DO distinguish those (see controller), because order IDs
 *   aren't sensitive on their own; email ownership is what's being protected.
 * - REP actor: no email check — reps can look up any order, but every
 *   lookup is logged with their repEmail for the audit trail.
 */
async function getOrderForActor({ externalOrderId, actor, email, requestId, ipAddress }) {
  // Cheap, synchronous checks happen before we ever touch the DB or the
  // upstream carrier. A request that can't possibly succeed shouldn't pay
  // for a cache-refresh transaction — that's wasted DB load on every bad
  // request, and under a cold Neon compute it's also what pushed a request
  // that should fail in <1ms into a 5s+ transaction timeout (see P2028s).
  if (actor.type === 'CUSTOMER' && !email) {
    throw AppError.badRequest('Email is required to look up an order', 'EMAIL_REQUIRED');
  }

  let order;
  try {
    order = await getCachedOrRefresh(externalOrderId);
  } catch (err) {
    // H-3 fix: a lookup against an order ID that doesn't exist upstream at
    // all previously left NO audit trail — the throw happened before
    // repo.logLookup was ever reached. That's a real blind spot, since
    // enumeration attempts are exactly the case the audit log exists to
    // catch. orderId is null here on purpose (there's no order row to
    // attach to) — see LookupAuditLog.orderId's nullability in the schema.
    if (err instanceof AppError && err.code === 'ORDER_NOT_FOUND') {
      await repo.logLookup({
        orderId: null,
        actorType: actor.type,
        repEmail: actor.type === 'REP' ? actor.repEmail : null,
        action: 'ORDER_LOOKUP_FAILED',
        requestId,
        ipAddress,
      });
    }
    throw err;
  }

  if (actor.type === 'CUSTOMER') {
    if (order.customerEmail.toLowerCase() !== email.toLowerCase()) {
      await repo.logLookup({
        orderId: order.id,
        actorType: 'CUSTOMER',
        repEmail: null,
        action: 'ORDER_LOOKUP_DENIED',
        requestId,
        ipAddress,
      });
      throw AppError.forbidden(
        `Order ${externalOrderId} found, but the email doesn't match our records for this order.`,
        'EMAIL_MISMATCH'
      );
    }
  }

  await repo.logLookup({
    orderId: order.id,
    actorType: actor.type,
    repEmail: actor.type === 'REP' ? actor.repEmail : null,
    action: 'ORDER_LOOKUP',
    requestId,
    ipAddress,
  });

  return order;
}

module.exports = { getOrderForActor };
