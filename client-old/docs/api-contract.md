# Reflex Logistics — Frontend's Proposed API Contract

Per `FULL_SCALE_DELIVERY_DIRECTIVE.md` §12: *"Frontend engineers should
expose the exact API calls and expected DTOs from the existing UI."*
This is that document — it's a **proposal for the backend team to
implement against, confirm, or push back on**, not a claim that these
endpoints exist. Where the directive's §8 already names an endpoint, the
path below matches it exactly. Where the directive is silent (sign-up,
delivery events), the path is this app's best guess, flagged as such.

Base URL: `VITE_API_BASE_URL` (see `.env.example`) — assumed to already
include any `/api` prefix, so paths below are relative to that.

---

## Auth

### `POST /auth/login`
**Confirmed path** (directive §8).

Request:
```json
{ "identifier": "string (email or phone — mechanism TBD)", "password": "string" }
```
Response `200`:
```json
{
  "user": { "id": "string", "name": "string", "role": "RETAILER|DISPATCHER|RIDER|SUPPORT_ADMIN|MANAGER_ADMIN|SYSTEM_ADMIN", "tenantId": "string|null", "phone": "string?", "email": "string?", "createdAt": "ISO-8601" },
  "accessToken": "string",
  "refreshToken": "string"
}
```
Errors: `400` invalid payload, `401` wrong credentials.

### `POST /auth/refresh`
**Confirmed path** (directive §8). Frontend assumes **rotation** — every
call returns a new `refreshToken` and the old one is invalidated
(directive §11 flags "DB-backed hashed refresh tokens", which implies
rotation is the intended model; **please confirm**).

Request: `{ "refreshToken": "string" }`
Response `200`: `{ "accessToken": "string", "refreshToken": "string" }`
Errors: `401` if the refresh token is invalid/expired/already used.

### `POST /auth/logout`
**Confirmed path** (directive §8). Request: none (uses the access token).
Response: `204`. Frontend clears local session state regardless of this
call's outcome.

### `GET /auth/me`
**Confirmed path** (directive §8). Session bootstrap / "who am I."
Response `200`: `{ "user": { ...same shape as login } }`
Errors: `401` if no valid session.

### `POST /auth/register` — **PROPOSED, not in directive §8**
Frontend addition for role-based sign-up. Needs explicit backend sign-off
— may not belong in MVP if manual account provisioning is preferred.

Three request shapes, discriminated by `role`. **Admin roles are never
sent by this frontend** — the sign-up UI doesn't offer them, and the
backend should independently reject an admin role on this endpoint even
if a client crafts one directly (self-service admin creation is a
privilege-escalation risk regardless of what the UI hides).

```json
// role: RETAILER — creates a NEW tenant
{ "role": "RETAILER", "name": "string", "identifier": "string", "password": "string", "businessName": "string" }

// role: DISPATCHER or RIDER — joins an EXISTING tenant via invite code,
// never a raw tenant id (frontend never asserts tenant access itself —
// the backend resolves the code to a tenant and validates it)
{ "role": "DISPATCHER", "name": "string", "identifier": "string", "password": "string", "organizationCode": "string" }
{ "role": "RIDER", "name": "string", "identifier": "string", "password": "string", "organizationCode": "string" }
```
Response `201`: same shape as login (`user` + `accessToken` + `refreshToken`)
— assumes auto-login on success. **Open question:** should there be an
email/phone verification step before first login? Not implemented on the
frontend; flag if required.
Errors: `400` validation, `409` identifier already registered, `404` or
`400` if `organizationCode` doesn't resolve to a tenant.

---

## Deliveries

### `POST /deliveries`
**Confirmed path.** Request (Create Delivery form, required fields per
product spec §9):
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
Response `201`: full `Delivery` object (see shape under GET below).

### `GET /deliveries`
**Confirmed path.** Query params: `page`, `pageSize`, `search`,
`status` (comma-separated for multiple, e.g. `status=ASSIGNED,ACCEPTED`).

Response `200` — **pagination envelope, PROPOSED shape** (directive §4
requires "one documented envelope and stable semantics" but doesn't
specify the shape):
```json
{ "items": [Delivery], "page": 1, "pageSize": 10, "totalItems": 42, "totalPages": 5 }
```

### `GET /deliveries/:id`
**Confirmed path.** Response `200` — `Delivery` shape:
```json
{
  "id": "string", "tenantId": "string",
  "status": "REQUESTED|ASSIGNED|ACCEPTED|PICKED_UP|IN_TRANSIT|DELIVERED|CANCELLED|FAILED|REASSIGNMENT_REQUIRED",
  "availableTransitions": ["string"]?  // NOT YET CONSUMED reliably — see open item below
  "customer": { "name": "string", "phone": "string", "address": "string" },
  "itemDescription": "string", "quantity": "number",
  "itemCategory": "string?", "approxWeightKg": "number?", "fragile": "boolean?",
  "perishable": "boolean?", "declaredValue": "number?", "priority": "string?",
  "paymentPreference": "string?", "specialInstructions": "string?",
  "assignedRiderId": "string?", "assignedVehicleId": "string?",
  "createdAt": "ISO-8601", "updatedAt": "ISO-8601"
}
```

### `GET /deliveries/:id/events` — **NOT in directive §8, flagged for confirmation**
Needed to render the delivery Timeline. Response `200`:
```json
[{ "id": "string", "deliveryId": "string", "status": "string", "occurredAt": "ISO-8601", "note": "string?" }]
```
If the backend team prefers to fold this into `GET /deliveries/:id`
instead (an `events` array on the Delivery object), the frontend can
adapt — this is a proposal, not a requirement.

### `POST /deliveries/:id/assign`
**Confirmed path.** Request: `{ "riderId": "string", "vehicleId": "string?" }`
Response `200`: updated `Delivery`.
**Conflict behavior (critical path — directive §9):** if the delivery was
already assigned by another dispatcher between this client's last read
and this request, respond `409` with a normal error envelope (see below).
The frontend's `DeliveryDetailDrawer` specifically handles `409` by
refetching `GET /deliveries/:id` and showing the authoritative state —
it never applies the attempted assignment optimistically.

### `POST /deliveries/:id/status`
**Confirmed path** (directive §8 names this exact path, POST). Request:
`{ "status": "string" }`. Response `200`: updated `Delivery`.

### `POST /deliveries/:id/proof-of-delivery`
**Confirmed path** (directive §8). Request — mechanism still open (OTP
assumed as the simplest placeholder):
`{ "method": "OTP", "value": "string" }`. Response `200`: updated `Delivery`
(expected to move to `DELIVERED` on success).
**Open question:** which mechanism is the backend actually planning —
OTP, QR, signature, or photo? Each implies a different request shape
(e.g. signature/photo would need multipart or a pre-uploaded asset
reference, not a plain string).

### `POST /deliveries/:id/incidents`
**Confirmed path.** Request:
```json
{ "type": "CUSTOMER_UNREACHABLE|ADDRESS_NOT_FOUND|ITEM_DAMAGED|VEHICLE_ISSUE|SAFETY_CONCERN|OTHER", "notes": "string?" }
```
Response `201`: `{ "id": "string", "deliveryId": "string", "reportedByRiderId": "string", "type": "string", "notes": "string?", "createdAt": "ISO-8601" }`

---

## Dispatch, riders, vehicles

### `GET /dispatch/...` — **directive §8 names this category, exact path not yet defined by either side**
Today the Dispatch Center gets its queue by calling `GET /deliveries`
with a `status` filter — that works for MVP but doesn't give the backend
room for dispatch-specific concerns (SLA breach flags, priority scoring,
live rider positions bundled with the queue). **Open item for backend:**
confirm whether `GET /deliveries?status=...` is sufficient long-term or
whether a dedicated `GET /dispatch/queue` (or similar) should replace it.
The frontend has not invented a guessed path here since the directive
itself doesn't specify one.

### `GET /riders`
**Confirmed path.** Response `200`:
```json
[{ "id": "string", "name": "string", "phone": "string", "availability": "AVAILABLE|BUSY|OFFLINE", "workloadCount": "number", "vehicleId": "string?", "location": { "lat": "number", "lng": "number", "updatedAt": "ISO-8601" }? }]
```

### `GET /vehicles`
**Confirmed path.** Response `200`:
```json
[{ "id": "string", "type": "MOTORCYCLE|BICYCLE|VAN|TRUCK", "capacityKg": "number?", "available": "boolean", "assignedRiderId": "string?" }]
```

---

## Error envelope

All non-2xx responses are expected in this shape (frontend's
`src/api/errors.ts` normalizes against it):
```json
{ "message": "string (human-readable)", "code": "string?", "fields": { "fieldName": "string" }? }
```
`fields` is used for `400` validation errors to highlight specific form
fields. Status code alone drives the frontend's error category
(`400`→VALIDATION, `401`→UNAUTHENTICATED, `403`→FORBIDDEN, `404`→NOT_FOUND,
`409`→CONFLICT, `429`→RATE_LIMITED, `5xx`→SERVER_ERROR) — `code`/`fields`
are supplementary, not required for basic error handling to work.

---

## Summary of open items for the backend team

1. Confirm `/auth/register` is wanted at all, and its verification flow.
2. Confirm refresh-token rotation behavior for `/auth/refresh`.
3. Confirm the pagination envelope shape above, or supply the real one.
4. Confirm or relocate `GET /deliveries/:id/events`.
5. Confirm `availableTransitions` will be included on `Delivery` — the
   frontend currently falls back to a hardcoded "likely next status" UX
   default when absent (see `src/utils/deliveryStateMachine.ts`), which
   is not authoritative and should be replaced once this field exists.
6. Confirm whether `GET /deliveries?status=` is sufficient for the
   dispatch queue or a dedicated `/dispatch/...` endpoint is planned.
7. Confirm the proof-of-delivery mechanism (OTP/QR/signature/photo).
