# FRONTEND_API_CONTRACT.md

Generated directly from the backend source (controllers, DTOs, Prisma
schema) as of commit `7e1f89a`. This is not a design document — it
describes exactly what exists. Anything not listed here does not exist.

---

## 1. Base URL

**Development:**
```
http://localhost:3000/api/v1
```

**Production:** set via the frontend's own env var (e.g. `VITE_API_URL`),
pointed at wherever the backend is deployed, with the same `/api/v1`
suffix — the backend hardcodes neither host nor port; it only fixes the
`api` prefix (`app.setGlobalPrefix('api')`) and version segment
(`VersioningType.URI`, default `1`) in `src/main.ts`.

Swagger/OpenAPI UI (live, always current): `http://localhost:3000/api/docs`

---

## 2 & 3. Authentication endpoints + exact TypeScript contracts

### `POST /auth/signup`
**Auth:** Public. **Rate limit:** 5/hour/IP.

Creates a **new organization (tenant) and its first user**. This is NOT
"create an account" for an existing org — it always creates a brand-new
tenant. The created user's role is **always `MANAGER_ADMIN`** (not
client-specified).

```ts
interface SignupRequest {
  organizationName: string; // 2-120 chars
  tenantSlug: string;       // 2-64 chars, lowercase alphanumeric + single hyphens
                             // regex: /^[a-z0-9]+(-[a-z0-9]+)*$/
                             // e.g. "acme-logistics", NOT "Acme Logistics" or "acme_logistics"
  email: string;            // valid email, max 254 chars
  password: string;         // 8-128 chars
  acceptedTerms: true;      // MUST be literally true - false or omitted both fail validation
}

interface SignupResponse {
  accessToken: string;
  refreshToken: string;
}
```
**Response status:** `201 Created`
**Note:** there is NO `user` object in this response. See Section 4.

**Errors:**
- `400 VALIDATION_ERROR` — any field fails validation (including `acceptedTerms: false`)
- `409 CONFLICT` — `tenantSlug` already taken

---

### `POST /auth/login`
**Auth:** Public. **Rate limit:** 10/min/IP.

```ts
interface LoginRequest {
  tenantSlug: string; // REQUIRED - see Section 6, this is not optional
  email: string;
  password: string;   // 1-128 chars (no minimum length re-check at login)
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
}
```
**Response status:** `200 OK`
**Note:** there is NO `user` object in this response, same as signup.

**Errors:**
- `401 INVALID_CREDENTIALS` — wrong tenant slug, wrong email, OR wrong
  password. **All three cases return the exact same error code and
  message, deliberately** (so the frontend cannot and should not try to
  distinguish "no such account" from "wrong password" — don't build UI
  that assumes it can tell these apart).
- `403 FORBIDDEN` — account locked (5 failed attempts within a window
  triggers a 15-minute lockout). Distinct message from the above; this
  IS distinguishable and can be shown to the user.
- `429 RATE_LIMITED`

---

### `POST /auth/refresh`
**Auth:** Public (no access token needed — the refresh token IS the credential).

```ts
interface RefreshRequest {
  refreshToken: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string; // a NEW refresh token - the old one is immediately revoked
}
```
**Response status:** `200 OK`

**Critical:** refresh tokens **rotate on every use**. The frontend MUST
store the new `refreshToken` from the response and discard the old one.
Retrying with a stale (already-used) refresh token returns `401`.

**Errors:**
- `401 AUTHENTICATION_REQUIRED` — invalid, expired, or already-rotated/revoked token

---

### `POST /auth/logout`
**Auth:** none enforced at the route level beyond the body itself (not
`@Public()`, but also doesn't read the access token — it revokes based on
the refresh token in the body). Send the access token in `Authorization`
anyway for consistency with every other authenticated call.

```ts
interface LogoutRequest {
  refreshToken: string;
}
```
**Response status:** `204 No Content` (empty body)

**Idempotent:** logging out twice, or with an already-invalid token, is a
no-op, not an error.

---

### `GET /auth/me` — **DOES NOT EXIST**

There is no session-bootstrap endpoint. Confirmed by direct inspection of
`src/auth/auth.controller.ts` — no such route is registered anywhere in
the codebase.

**How session bootstrap actually works today:** decode the JWT
`accessToken` client-side. Its payload is:

```ts
interface AccessTokenPayload {
  sub: string;      // user id
  tenantId: string;
  role: RoleName;    // see Section 5
  type: 'access';
  iat: number;
  exp: number;
}
```

This gives you `id`, `tenantId`, and `role` — **nothing else**. No
`email`, no `phoneNumber`, no `isActive`. If the UI needs the logged-in
user's email displayed anywhere post-login, there is currently no backend
endpoint that provides it — the frontend would need to have captured it
from the login form input itself (the value the user just typed), since
the backend never echoes it back.

**Recommendation for tonight:** decode the JWT for `id`/`tenantId`/`role`
(any JWT-decode library, e.g. `jwt-decode` — do NOT verify the signature
client-side, that's meaningless without the secret; just read the
payload). Treat "logged in" as "a non-expired, decodable access token is
present." Do not build a UI that depends on a `GET /auth/me` call —
build it against the decoded token, and flag `GET /auth/me` as backend
work needed if the UI actually requires email/phone/isActive display.

---

## 4. User object

**There is no full "User" object returned by ANY endpoint.** The closest
thing that exists is the response from `POST /admin/users`:

```ts
interface CreatedUserResponse {
  id: string;
  email: string;
  role: RoleName;
}
```
That's it — three fields, guaranteed present, and this is the ONLY
endpoint that returns anything shaped like a user at all. `phoneNumber`
and `isActive` exist as database columns (`prisma/schema.prisma`) but are
**never returned in any API response** anywhere in this codebase today.

If the frontend's design assumes a `User` object with more fields is
available from login/signup/refresh, that assumption is wrong — those
three endpoints return only `{ accessToken, refreshToken }` (Section 3).

---

## 5. Roles

Exact enum (`prisma/schema.prisma`, `enum UserRole`) — **use these exact
strings, case-sensitive:**

```ts
type RoleName =
  | 'RETAILER'
  | 'DISPATCHER'
  | 'RIDER'
  | 'SUPPORT_ADMIN'
  | 'MANAGER_ADMIN'
  | 'SYSTEM_ADMIN';
```

There is no plain `'ADMIN'` value. Don't invent one.

**Self-registration:** only `MANAGER_ADMIN` can be created via
self-service, and only implicitly — `POST /auth/signup` always assigns
`MANAGER_ADMIN` to the new user; the role is not a request field.

**Invited/admin-created:** every other role (`RETAILER`, `DISPATCHER`,
`RIDER`, `SUPPORT_ADMIN`, and additional `MANAGER_ADMIN`s) is created via
`POST /admin/users`, callable only by an existing `MANAGER_ADMIN` or
`SYSTEM_ADMIN` **within that same tenant**. There is no cross-tenant user
creation.

**`SYSTEM_ADMIN` cannot be created via either endpoint** — not via
signup, not via `/admin/users` (the DTO's `@IsIn` validator rejects it
outright, returning `400`). No API path provisions a `SYSTEM_ADMIN`
today.

---

## 6. Multi-tenancy — read this section carefully

**The backend has no concept of "identifier" as email-or-phone.** If the
frontend currently has an `identifier` field on the login form trying to
double as email-or-phone, that does not match the backend at all. The
actual login contract is exactly three fields: `tenantSlug`, `email`,
`password`.

**Why `tenantSlug` is required:** `email` is unique *within* a tenant in
the database, not globally. Two different organizations can have staff
members with the same email address. There is no way to look up "which
tenant does this email belong to" without the slug — the backend does not
maintain a global email index.

**Intended login UX** (this is a real product decision the frontend needs
to make, not a technical detail to hide): the user must supply, in
addition to email + password, which organization they belong to. Concrete
options, in order of how much backend work each needs:

1. **A third form field, "Organization ID" / "Company code"**, mapped
   directly to `tenantSlug`. Zero backend changes needed — ship this
   tonight.
2. **Subdomain-based** (`acme-logistics.yourapp.com` → `tenantSlug:
   "acme-logistics"` derived from the hostname, hidden from the user).
   Needs frontend routing/hosting changes, not a backend blocker, but more
   work than tonight likely allows.
3. **A separate "look up my organization" step** (e.g. by email) before
   showing the password field — **this endpoint does not exist on the
   backend.** Do not build UI assuming it does.

**There is no separate "organization code" or "invitation code" concept
anywhere in the backend.** `tenantSlug` is the only tenant identifier that
exists. Signup lets the user pick it directly (validated as
lowercase-alphanumeric-with-hyphens); there's no invite-code redemption
flow.

**Recommendation for tonight:** go with option 1. Rename the frontend's
`identifier` field usage — split it into two real fields: `tenantSlug`
(a new, explicit field, e.g. labeled "Organization ID") and `email`. Do
not try to make one field serve both purposes; the backend has no logic
that would make that work.

---

## 7. Token handling

- **Access token:** JWT, HS256, **15-minute expiry** (`JWT_ACCESS_EXPIRES_IN`, default `15m`).
- **Refresh token:** JWT, HS256, **7-day expiry** (`JWT_REFRESH_EXPIRES_IN`, default `7d`), rotates on every use (Section 3).
- **Authorization header**, on every authenticated request:
  ```
  Authorization: Bearer <accessToken>
  ```
- **No cookies are used anywhere.** The backend does not set or read any
  auth cookie. `credentials: 'include'` is unnecessary on fetch calls —
  just set the header above.
- **Refresh behavior:** call `POST /auth/refresh` with the current
  `refreshToken`; store both returned tokens, discarding the old refresh
  token.
- **Logout/revocation:** `POST /auth/logout` revokes the refresh token
  server-side (its DB record is marked revoked). The access token itself
  is **not** revoked — it remains valid (cryptographically) until its own
  15-minute expiry lapses, even after logout. This is a deliberate
  trade-off (stateless access tokens), not a bug — don't rely on an access
  token being instantly invalid post-logout.
- **What to do after a 401:**
  1. If the failing call was itself `/auth/refresh`, the refresh token is
     dead — clear all stored tokens and redirect to login.
  2. Otherwise, attempt exactly one `POST /auth/refresh` using the stored
     refresh token, then retry the original request once with the new
     access token.
  3. If the refresh call itself fails (→ case 1), clear tokens and
     redirect to login. Do not infinite-loop retry.

---

## 8. Error contract

**The actual shape** (`src/common/filters/global-exception.filter.ts`) —
this is NOT `{ message, code, fields }`. It is:

```ts
interface ApiErrorResponse {
  error: {
    code: string;       // e.g. "INVALID_CREDENTIALS", "VALIDATION_ERROR"
    message: string;    // human-readable, safe to display
    requestId: string;  // UUID, useful for support/debugging correlation
    details?: unknown;  // present on some 4xx errors only; shape varies, do not depend on it
  };
}
```

Rewrite the frontend's `ApiError` abstraction around `error.code` /
`error.message` / `error.requestId` — there is no top-level `message`,
`code`, or `fields` key; everything is nested under `error`.

**Every error code currently in use, with its HTTP status:**

| Code | HTTP Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Malformed request body/query |
| `AUTHENTICATION_REQUIRED` | 401 | Missing/invalid/expired access token, or dead refresh token |
| `INVALID_CREDENTIALS` | 401 | Login failure (any cause — Section 3) |
| `FORBIDDEN` | 403 | Authenticated, but not authorized (wrong role, locked account, or accessing another rider's resource) |
| `NOT_FOUND` | 404 | Resource doesn't exist OR belongs to another tenant/rider (deliberately identical — see Section 6's tenant-isolation note) |
| `CONFLICT` | 409 | Duplicate (tenant slug taken, concurrent assignment race lost, idempotency key in flight) |
| `BUSINESS_RULE_VIOLATION` | 422 | Valid request, but violates a domain rule (invalid state transition, ineligible vehicle, expired proof token) |
| `RATE_LIMITED` | 429 | Too many requests |
| `DEPENDENCY_UNAVAILABLE` | 503 | Database/Redis down (readiness-related) |
| `INTERNAL_ERROR` | 500 | Unexpected server error — message is always the generic `"An unexpected error occurred."`, never leaks internals |

**400 body shape specifically** (class-validator failures): `error.message`
is a semicolon-joined string of every failing field's validation message,
e.g. `"email must be an email; password must be longer than or equal to 8 characters"`
— it's one string, not a per-field map. If the frontend needs per-field
error highlighting, it will need to parse this string or the backend
would need a change (not built).

---

## 9. CORS / frontend connection

`src/main.ts`: `app.enableCors({ origin: config.get('cors.origin') })`.

- **Default** (`CORS_ORIGIN` env var unset): `origin: '*'` — any origin allowed.
- **No credentials mode is set** (`credentials` is omitted from the CORS
  config) — consistent with Section 7 (no cookies are used, so none are
  needed).
- For local dev against the default config, **no frontend-side CORS
  workaround is needed** — `http://localhost:5173` (or any origin) is
  already allowed. If `CORS_ORIGIN` is later locked down to a specific
  origin for production, set it to the frontend's deployed URL exactly
  (scheme + host + port, no trailing slash).

---

## 10 & 11. Endpoint inventory with implementation status

**Status key:** `IMPLEMENTED` = code exists, unit-tested, and (as of the
error trace shared earlier) confirmed to compile against a real generated
Prisma client. `NOT E2E-VERIFIED` = implemented but no automated
end-to-end test has been run against a live request yet — appended as a
note, not a separate status, since the code path itself is real.

| Feature | Method | Endpoint | Auth | Request | Response |
|---|---|---|---|---|---|
| Health check | GET | `/health` | Public | — | `{ status, ... }` |
| Readiness check | GET | `/ready` | Public | — | `{ status, details: { database, redis } }` |
| Current terms | GET | `/legal/terms` | Public | — | `{ version: string, url: string }` |
| Signup | POST | `/auth/signup` | Public | `SignupRequest` | `SignupResponse` |
| Login | POST | `/auth/login` | Public | `LoginRequest` | `LoginResponse` |
| Refresh | POST | `/auth/refresh` | Public | `RefreshRequest` | `RefreshResponse` |
| Logout | POST | `/auth/logout` | Bearer | `LogoutRequest` | 204 |
| Create customer | POST | `/customers` | Bearer, RETAILER+ | `CreateCustomerDto` | `Customer` |
| List customers | GET | `/customers` | Bearer | — | `Customer[]` |
| Get customer | GET | `/customers/:id` | Bearer | — | `Customer` |
| Create delivery | POST | `/deliveries` | Bearer, RETAILER+, **`Idempotency-Key` header required** | `CreateDeliveryDto` | `Delivery` (201) |
| List deliveries | GET | `/deliveries` | Bearer | query params | `{ data: Delivery[], nextCursor: string \| null }` |
| Get delivery | GET | `/deliveries/:id` | Bearer | — | `Delivery & { statusEvents: DeliveryStatusEvent[] }` |
| Rider status transition | PATCH | `/deliveries/:id/status` | Bearer, RIDER (own delivery only) | `{ toStatus, reason? }` | `Delivery` |
| Cancel delivery | PATCH | `/deliveries/:id/cancel` | Bearer, RETAILER+ | — | `Delivery` |
| Dispatch candidates | GET | `/deliveries/:id/candidates` | Bearer, DISPATCHER+ | — | `RankedCandidate[]` |
| Assign delivery | PATCH | `/deliveries/:id/assign` | Bearer, DISPATCHER+ | `{ riderId, vehicleId }` | `Delivery` |
| Request reassignment | PATCH | `/deliveries/:id/request-reassignment` | Bearer, DISPATCHER+ | `{ reason }` | `Delivery` |
| Request proof token | POST | `/deliveries/:id/proof-of-delivery/request` | Bearer, RIDER (own delivery only) | — | `{ token: string }` (201) |
| Confirm proof | POST | `/deliveries/:id/proof-of-delivery/confirm` | Bearer, RIDER (own delivery only) | `{ token: string }` | `Delivery` (200, status DELIVERED) |
| List riders | GET | `/riders` | Bearer, DISPATCHER+ | — | `Rider[]` |
| List available riders | GET | `/riders/available` | Bearer, DISPATCHER+ | — | `Rider[]` |
| Set own availability | PATCH | `/riders/:id/availability` | Bearer, RIDER (own record only) | `{ isAvailable: boolean }` | `Rider` |
| Create vehicle | POST | `/vehicles` | Bearer, DISPATCHER+ | `CreateVehicleDto` | `Vehicle` |
| List vehicles | GET | `/vehicles` | Bearer | — | `Vehicle[]` |
| Get vehicle | GET | `/vehicles/:id` | Bearer | — | `Vehicle` |
| Report incident | POST | `/deliveries/:deliveryId/incidents` | Bearer, RIDER/DISPATCHER+ | `CreateIncidentDto` | `Incident` |
| List delivery incidents | GET | `/deliveries/:deliveryId/incidents` | Bearer | — | `Incident[]` |
| Resolve incident | PATCH | `/incidents/:id/resolve` | Bearer, DISPATCHER+ | — | `Incident` |
| Create user (invite) | POST | `/admin/users` | Bearer, MANAGER_ADMIN+ | `{ email, password, role }` | `CreatedUserResponse` (201) |

**All rows above are `IMPLEMENTED`.** Every row is backed by real
controller/service/DTO code with unit-test coverage (135 passing tests as
of the last backend session). None have been run end-to-end against a
live database from this side yet — treat the shapes above as accurate to
the code, and report back immediately if live testing tonight shows any
discrepancy, since that would indicate a real bug worth fixing, not a
contract-doc error.

**NOT IMPLEMENTED — do not build against these:**
- `GET /auth/me` (Section 3)
- Any password-reset / forgot-password flow
- Any email-verification flow
- Any invitation-token/email-based user creation (current `/admin/users` is admin-sets-password-directly, see Section 5)
- Any real-time/WebSocket transport
- Any notifications endpoint
- Any payments endpoint
- Any tracking/location endpoint
- MFA
- User deactivation, role change, or tenant configuration endpoints

---

## Full request/response TypeScript types

```ts
type RoleName =
  | 'RETAILER' | 'DISPATCHER' | 'RIDER'
  | 'SUPPORT_ADMIN' | 'MANAGER_ADMIN' | 'SYSTEM_ADMIN';

type DeliveryStatus =
  | 'REQUESTED' | 'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT'
  | 'DELIVERED' | 'CANCELLED' | 'FAILED' | 'REASSIGNMENT_REQUIRED';

type VehicleType = 'MOTORCYCLE' | 'CAR' | 'VAN' | 'PICKUP' | 'TRUCK' | 'LORRY';

type IncidentType =
  | 'VEHICLE_BREAKDOWN' | 'RIDER_UNAVAILABLE' | 'ACCIDENT' | 'ROAD_BLOCKAGE'
  | 'CUSTOMER_UNREACHABLE' | 'WRONG_ADDRESS' | 'DAMAGED_GOODS' | 'OTHER';

type IncidentStatus = 'OPEN' | 'RESOLVED';

// ---- Auth ----
interface SignupRequest {
  organizationName: string;
  tenantSlug: string;
  email: string;
  password: string;
  acceptedTerms: true;
}
interface LoginRequest { tenantSlug: string; email: string; password: string; }
interface RefreshRequest { refreshToken: string; }
interface LogoutRequest { refreshToken: string; }
interface TokenResponse { accessToken: string; refreshToken: string; }
// SignupResponse, LoginResponse, RefreshResponse are all = TokenResponse

// ---- Domain entities (exact Prisma field shape returned as-is) ----
interface Customer {
  id: string; tenantId: string; name: string; phoneNumber: string;
  address: string; createdAt: string; updatedAt: string;
}

interface Delivery {
  id: string; tenantId: string; customerId: string; createdByUserId: string;
  pickupAddress: string; dropoffAddress: string; weightKg: number | null;
  status: DeliveryStatus;
  riderId: string | null; vehicleId: string | null;
  assignedAt: string | null; deliveredAt: string | null;
  // NOTE: proofTokenHash / proofTokenExpiresAt / proofConfirmedAt are ALSO
  // present on this object as returned today (see "Known issue" below) -
  // do not display them, but expect them in the raw JSON.
  proofTokenHash: string | null;
  proofTokenExpiresAt: string | null;
  proofConfirmedAt: string | null;
  createdAt: string; updatedAt: string;
  statusEvents?: DeliveryStatusEvent[]; // present on GET /deliveries/:id only
}

interface DeliveryStatusEvent {
  id: string; deliveryId: string;
  fromStatus: DeliveryStatus | null; toStatus: DeliveryStatus;
  changedBy: string | null; changedAt: string;
  metadata: Record<string, unknown> | null;
}

interface Rider {
  id: string; tenantId: string; userId: string; isAvailable: boolean;
  createdAt: string; updatedAt: string;
  user?: { id: string; email: string }; // included on GET /riders, /riders/available
  vehicles?: Vehicle[];                  // included on GET /riders/available only
}

interface Vehicle {
  id: string; tenantId: string; riderId: string | null; type: VehicleType;
  capacityWeightKg: number; isActive: boolean;
  createdAt: string; updatedAt: string;
}

interface Incident {
  id: string; tenantId: string; deliveryId: string; reportedById: string;
  type: IncidentType; description: string; status: IncidentStatus;
  createdAt: string; resolvedAt: string | null;
}

interface RankedCandidate {
  riderId: string;
  activeDeliveryCount: number;
  suggestedVehicleId?: string;
}

interface CreatedUserResponse { id: string; email: string; role: RoleName; }

interface ListDeliveriesResponse { data: Delivery[]; nextCursor: string | null; }

interface ApiErrorResponse {
  error: { code: string; message: string; requestId: string; details?: unknown };
}
```

**Known issue, flagged not fixed (out of scope for this doc per your
instructions):** the `Delivery` object as returned by every endpoint
includes `proofTokenHash`, `proofTokenExpiresAt`, and `proofConfirmedAt`
verbatim — these are internal fields that probably shouldn't be exposed
to any client. Not a redesign call to make here; flagging so the frontend
knows to ignore/not-display them rather than assuming their presence is
intentional API design.

---

## 12. Integration examples

### Login — curl
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"tenantSlug":"acme-logistics","email":"owner@acme-logistics.example","password":"correct-horse-battery-staple"}'
```

### Login — fetch
```ts
const res = await fetch('http://localhost:3000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ tenantSlug, email, password }),
});
if (!res.ok) {
  const { error } = await res.json();
  throw new Error(`${error.code}: ${error.message}`);
}
const { accessToken, refreshToken }: TokenResponse = await res.json();
```

### Create a delivery — curl (note the required Idempotency-Key header)
```bash
curl -X POST http://localhost:3000/api/v1/deliveries \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"customerId":"<uuid>","pickupAddress":"1 Warehouse Rd","dropoffAddress":"123 Main St","weightKg":50}'
```

### Create a delivery — fetch
```ts
const res = await fetch(`${API_BASE}/deliveries`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'Idempotency-Key': crypto.randomUUID(),
  },
  body: JSON.stringify({ customerId, pickupAddress, dropoffAddress, weightKg }),
});
```

---

## Verify the backend is running and reachable

```bash
cd backend
npm run start:dev
```

Then, in a second terminal:

```bash
curl http://localhost:3000/api/v1/health
# expect: {"status":"ok",...}

curl http://localhost:3000/api/v1/ready
# expect: {"status":"ok","details":{"database":{"status":"up"},"redis":{"status":"up"}}}
# a non-200 here means Postgres or Redis isn't reachable - fix that before testing anything else

curl http://localhost:3000/api/v1/legal/terms
# expect: {"version":"...","url":"..."}
```

Swagger UI for interactive testing of every endpoint above:
`http://localhost:3000/api/docs`

If `/ready` fails: check `DATABASE_URL`/`REDIS_URL` in `.env`, confirm
`npx prisma migrate dev` has been run, confirm Postgres/Redis are actually
running and reachable at those URLs.
