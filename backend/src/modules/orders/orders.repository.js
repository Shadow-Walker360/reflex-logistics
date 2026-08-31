const db = require('../../db/client');

async function findByExternalId(externalOrderId) {
  return db.order.findUnique({
    where: { externalOrderId },
    include: {
      items: true,
      returns: true,
      trackingEvents: { orderBy: { sequence: 'asc' } },
    },
  });
}

/**
 * Upserts the cached order shell + replaces items/trackingEvents wholesale.
 * Wrapped in a transaction so a partial upstream response never leaves the
 * cache in a half-updated state.
 */
async function upsertFromUpstream(externalOrderId, upstreamData) {
  const { items, trackingEvents, ...orderFields } = upstreamData;

  // Only the writes need to be atomic — reading the result back doesn't,
  // so it happens after commit, outside the transaction. That drops one
  // round trip from the timeout-sensitive window and lets the read use a
  // fresh connection instead of holding the transaction's connection open
  // longer than necessary.
  //
  // `timeout`/`maxWait` are set explicitly (not left at Prisma's 5000ms
  // default) because this transaction does 5 sequential round trips
  // (upsert, delete, createMany, delete, createMany), and against Neon's
  // serverless Postgres a cold compute can add multiple seconds of latency
  // to the *first* query after idle. That's expected serverless behavior,
  // not a bug — the timeout needs to have room for it. If this consistently
  // needs more than ~15s even on a warm compute, that's a signal to
  // restructure the write pattern (see repository comment below), not to
  // keep raising the number.
  const orderId = await db.$transaction(
    async (tx) => {
      const order = await tx.order.upsert({
        where: { externalOrderId },
        update: { ...orderFields },
        create: { externalOrderId, ...orderFields },
      });

      // NOTE: wholesale delete+recreate is simple and correct, but it's 4 of
      // this transaction's 5 round trips. If cache-refresh latency is still
      // a problem after the timeout fix, the next step is diffing
      // items/trackingEvents and only writing what changed, rather than
      // dropping and rebuilding the full child set every 60s.
      await tx.orderItem.deleteMany({ where: { orderId: order.id } });
      await tx.orderItem.createMany({
        data: items.map((item) => ({ ...item, orderId: order.id })),
      });

      await tx.trackingEvent.deleteMany({ where: { orderId: order.id } });
      await tx.trackingEvent.createMany({
        data: trackingEvents.map((ev) => ({ ...ev, orderId: order.id })),
      });

      return order.id;
    },
    { timeout: 15_000, maxWait: 10_000 }
  );

  return db.order.findUnique({
    where: { id: orderId },
    include: { items: true, returns: true, trackingEvents: { orderBy: { sequence: 'asc' } } },
  });
}

async function logLookup({ orderId, actorType, repEmail, action, requestId, ipAddress }) {
  return db.lookupAuditLog.create({
    data: { orderId, actorType, repEmail, action, requestId, ipAddress },
  });
}

module.exports = { findByExternalId, upsertFromUpstream, logLookup };
