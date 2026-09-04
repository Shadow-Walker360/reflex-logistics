# Reflex Logistics — Frontend API Contract Status

## Superseded for authentication

Everything this file previously proposed for `/auth/*` was a **guess**
made before a real backend contract existed. As of this update, a real
one does: [`FRONTEND_API_CONTRACT.md`](FRONTEND_API_CONTRACT.md),
generated directly from the backend's actual controllers/DTOs/Prisma
schema. That file is now authoritative for auth. This file's old
`/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout`,
`/auth/me` sections have been deleted rather than left inline and
possibly-stale — go to `FRONTEND_API_CONTRACT.md` §2–§8 for the real
signup/login/refresh/logout contract, error envelope shape, and token
handling rules. The frontend's `services/authService.ts`,
`features/auth/*`, and `api/errors.ts` have been rewritten to match it —
see their file-level docstrings for what changed and why.

Key differences worth knowing if you're used to the old (wrong) contract:
- Login needs three fields — `tenantSlug`, `email`, `password` — not a
  single `identifier`.
- Signup creates a new organization + `MANAGER_ADMIN` user; there is no
  self-serve Retailer/Dispatcher/Rider role selection at signup.
- There is no `GET /auth/me`. Session identity comes from decoding the
  access token's JWT payload (`src/utils/jwt.ts`).
- The error envelope is `{ error: { code, message, requestId } }`, not
  `{ message, code, fields }`.

## NOT yet reconciled — flagged, not silently left wrong

`FRONTEND_API_CONTRACT.md` also confirms real endpoints and shapes for
deliveries, riders, vehicles, and incidents (its §10/§11 and the full
TypeScript types at the bottom of that file). **This pass intentionally
did not touch `deliveryService.ts`, `riderService.ts`, or
`vehicleService.ts`** — the request that drove this update was scoped
explicitly to the authentication layer ("Do not make broad UI changes.
This is a contract-alignment/refactor only," referring to auth).

That means `services/deliveryService.ts` and friends still reflect the
**old, unconfirmed proposal** below, which in several places is now
known to be wrong against the real contract — for example:
- Assignment is `PATCH /deliveries/:id/assign`, not `POST` as currently implemented.
- Status transitions are `PATCH /deliveries/:id/status` with a `toStatus` field, not `POST .../status` with a `status` field.
- Proof of delivery is a two-step `POST .../proof-of-delivery/request` then `POST .../proof-of-delivery/confirm` flow, not the single-step `POST .../proof-of-delivery` currently implemented.
- List deliveries returns `{ data, nextCursor }` (cursor pagination), not `{ items, page, pageSize, totalItems, totalPages }`.
- Creating a delivery requires an `Idempotency-Key` header, not currently sent.
- There's no `GET /deliveries/:id/events` — history comes from `statusEvents` on the delivery object itself.

**This is a known, tracked gap, not an oversight** — reconciling the
delivery/dispatch/rider/vehicle services against
`FRONTEND_API_CONTRACT.md` is the next follow-up pass, separate from
tonight's auth fix. Anyone picking that up should treat
`FRONTEND_API_CONTRACT.md` as the sole source of truth and can discard
everything below this line once that work is done.

---

## [OLD, UNCONFIRMED, PARTIALLY WRONG] Delivery/dispatch proposal

The auth section that used to precede this has been removed (see above).
What remains below is the original delivery/dispatch/rider/vehicle
proposal, kept only so the follow-up work has a record of what the
frontend used to assume — cross-check every line against
`FRONTEND_API_CONTRACT.md` rather than trusting it.

### `POST /deliveries`
Request (Create Delivery form, required fields per product spec §9):
```json
{
  "customer": { "name": "string", "phone": "string", "address": "string" },
  "itemDescription": "string",
  "quantity": "number",
  "itemCategory": "string?",
  "approxWeightKg": "number?",
  "fragile": "boolean?",
  "perishable": "boolean?",
  "declaredValue": "number?",
  "priority": "STANDARD|URGENT?",
  "paymentPreference": "CASH_ON_DELIVERY|MOBILE_MONEY|PREPAID?",
  "specialInstructions": "string?"
}
```
**Superseded** — the real `CreateDeliveryDto` shape uses
`customerId`/`pickupAddress`/`dropoffAddress`/`weightKg` per
`FRONTEND_API_CONTRACT.md`, a materially different shape (a `Customer`
must already exist via `POST /customers` first).

### `GET /deliveries`, `GET /deliveries/:id`, assignment, status, proof-of-delivery, incidents, riders, vehicles

See the flagged discrepancies list above — every one of these needs a
line-by-line reconciliation against `FRONTEND_API_CONTRACT.md` §10/§11's
endpoint table and the TypeScript types at the bottom of that file. Not
reproduced here again to avoid maintaining two competing "proposed"
documents — go to the authoritative one.
