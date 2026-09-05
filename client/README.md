# Reflex Logistics — Frontend (`client/`)

React + TypeScript + Vite frontend for Reflex Logistics: role-based delivery
orchestration for Retailers, Dispatchers, and Riders (Admin roles are
scaffolded, not built).

This README is the frontend's own source of truth for what's actually
implemented, what's planned, and what's blocked on a backend decision.
**If something isn't listed as IMPLEMENTED below, assume it doesn't exist
yet, no matter how complete the corresponding UI looks.**

Visual design and UX behavior are documented separately and in the same
spirit — code-accurate, not aspirational:
- [`docs/design-system.md`](docs/design-system.md) — colors, typography,
  spacing, glass surfaces, component variants, accessibility/animation
  principles
- [`docs/ux-guidelines.md`](docs/ux-guidelines.md) — role experiences,
  navigation rules, dashboard structure, error/loading/empty-state
  behavior, mobile strategy, auth UX
- [`docs/FRONTEND_API_CONTRACT.md`](docs/FRONTEND_API_CONTRACT.md) —
  the authoritative, backend-generated API contract. Confirmed and
  followed exactly for authentication (§8); deliveries/dispatch/riders/
  vehicles are confirmed here too but not yet reconciled in this
  codebase (see `docs/api-contract.md` and §12)
- [`docs/api-contract.md`](docs/api-contract.md) — status tracker: what's
  now confirmed vs. what in the old delivery/dispatch proposal is known
  to be wrong against the real contract above

**Development environment note:** built and verified on Windows 10
without Docker (Node.js + npm only — see §4). No part of the frontend
itself requires Docker; that only becomes relevant once a real backend +
Postgres + Redis stack needs to run locally, which is explicitly out of
scope for this app's own setup.

Owners: Tedde Adams & Sylvia Achieng (Frontend), Deborah Thuku (UI/UX),
Collins Joshua (Technical/Project Lead).

---

## 1. Purpose

Reflex connects Retailers → Dispatcher → Rider + Vehicle → Delivery →
Customer. This app is the frontend for that loop. It renders state the
backend reports, sends the actions each role takes, and never invents
authorization, dispatch scoring, or delivery-state transitions on its own.
See `/docs` (referenced throughout the engineering spec this was built
from) for the full architectural rationale — this README is the practical,
code-accurate companion to it.

## 2. Architecture

```
React (this app)
   ↓
services/  (one module per backend resource — the only callers of api/)
   ↓
api/client.ts  (the only place fetch() is called)
   ↓
NestJS backend
```

The frontend never connects to Postgres, Prisma, Redis, or RabbitMQ
directly, never determines authorization, and never mutates delivery state
locally without a backend response confirming it. Route guards
(`ProtectedRoute`, `RoleRoute`) are UX convenience — see their docstrings —
not the security boundary. The backend independently authorizes every
request.

## 3. Folder structure

```
src/
├── app/            App shell: providers, QueryClient config, error boundary
├── components/     Reusable, domain-agnostic UI primitives
├── features/       Domain logic per role: auth/, retailer/, dispatcher/, rider/, admin/
├── layouts/        Role-specific page shells
├── pages/          Cross-cutting standalone pages (404, 403)
├── routes/         The single route tree (routes/index.tsx)
├── services/       One module per backend resource — only caller of api/
├── api/            HTTP client + error normalization — the only fetch() boundary
├── hooks/          Cross-cutting hooks not tied to one feature
├── state/          Client-only UI state (Zustand) — never server data
├── types/          Domain types mirroring backend resources
├── utils/          Pure helpers (e.g. delivery state-machine guards)
├── realtime/       Transport-agnostic realtime abstraction (currently no-op)
├── maps/           Map visualization boundary (currently placeholder)
└── config/         Env access — the only file reading import.meta.env
```

A component/hook belongs in `features/<role>/` until it's needed by a
second role — then it moves to `components/` or `hooks/`. This is what
lets Adams and Sylvia work in different `features/` folders without
constant merge conflicts; only `components/`, `types/`, and `api/` are
genuinely shared surface area, and changes there should be called out in
PRs.

## 4. Development commands

```bash
npm install
cp .env.example .env.local   # then fill in VITE_API_BASE_URL
npm run dev                  # http://localhost:5173
npm run build                # tsc -b && vite build
npm run preview              # preview the production build
npm run typecheck            # tsc --noEmit
npm run lint
npm test                     # vitest run
npm run test:watch
```

## 5. Environment configuration

See `.env.example` for the full list with comments. Summary:

| Variable | Required | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | Yes | Backend API base, **confirmed** to be `http://localhost:3000/api/v1` in dev (`FRONTEND_API_CONTRACT.md` §1 — the backend fixes the `api` prefix and `v1` version segment). App throws at startup if unset. |
| `VITE_API_TIMEOUT_MS` | No | Default 15000. |
| `VITE_REALTIME_URL` | No | Empty = realtime falls back to a no-op transport (see §9). |
| `VITE_MAPS_PROVIDER` / `VITE_MAPS_API_KEY` | No | Empty = map renders a placeholder (see §10). |

**No secrets ever go in a `VITE_*` variable** — anything prefixed `VITE_`
ships to the browser. `.env.local` is gitignored; never commit real values.

## 6. State management rules

- **Server data** (deliveries, riders, vehicles, payments) lives **only**
  in TanStack Query's cache, fetched through `services/`. Never duplicate
  it into a Zustand store.
- **UI-only state** (sidebar open, active filters, connection banners,
  pending-offline-actions) lives in `state/` (Zustand). It is never treated
  as authoritative delivery data.
- **Auth session** (`state/authStore.ts`) is in-memory only for now — see
  §8 for why, and the Backend Dependencies list below.

## 7. API integration rules

- Components and hooks **never** call `fetch` or import `api/client.ts`
  directly. They call a `services/*.ts` function.
- Every `services/*.ts` file is the **only** caller of `api/client.ts` for
  its resource.
- Every API failure becomes an `ApiError` with a normalized `category`
  (`VALIDATION`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`,
  `RATE_LIMITED`, `SERVER_ERROR`, `NETWORK_ERROR`, `TIMEOUT`, `UNKNOWN`).
  UI code branches on `error.category`, never on raw HTTP status.
- `API_ERROR_MESSAGES` (`src/api/errors.ts`) is the single place
  user-facing error copy is defined. Don't hardcode error strings in
  components.

## 8. Authentication — CONFIRMED against real backend source

Unlike most of this README, this section describes a **confirmed**
contract, not an assumption — see
[`docs/FRONTEND_API_CONTRACT.md`](docs/FRONTEND_API_CONTRACT.md),
generated directly from the backend's controllers/DTOs/Prisma schema.
This file was rewritten to match it exactly; where the previous version
of this codebase guessed wrong, that's noted below rather than hidden.

**IMPLEMENTED, matching the confirmed contract:**
- `POST /auth/signup` — creates a **new organization (tenant) and its
  first user**, who is **always assigned `MANAGER_ADMIN`** by the
  backend (not client-chosen). `SignUpPage` reflects this honestly: it's
  "create your organization," not a Retailer/Dispatcher/Rider role
  picker. Inviting other roles into that organization is a separate,
  admin-only flow (`POST /admin/users`) that has no UI yet — see §13.
- `POST /auth/login` — requires **three fields**: `tenantSlug`, `email`,
  `password`. There is no `identifier` field and no email-or-phone
  flexibility; `email` is only unique *within* a tenant, so the
  organization ID is required, not optional UX polish. `LoginPage`
  collects all three.
- `POST /auth/refresh` — refresh tokens **rotate on every use**; the
  frontend always stores the newly-returned `refreshToken` and discards
  the old one (`src/state/authStore.ts`).
- `POST /auth/logout` — sends `{ refreshToken }` in the body (confirmed
  idempotent server-side — logging out twice is a no-op, not an error).
- Client-side **silent-refresh-and-retry**: any request that comes back
  `401` triggers one `POST /auth/refresh` attempt (deduplicated if
  several requests 401 at once — `src/api/refreshCoordinator.ts`),
  retries the original request once on success, and clears the session
  on failure.
- **No `GET /auth/me` call anywhere** — confirmed not to exist on the
  backend. Session identity (`id`, `tenantId`, `role`) comes from
  decoding the returned access token's JWT payload
  (`src/utils/jwt.ts#decodeAccessToken`) — this never verifies the
  signature (meaningless without the signing secret) and shouldn't be
  treated as a security check; the backend independently validates every
  authenticated request regardless.
- Error handling matches the confirmed envelope —
  `{ error: { code, message, requestId } }`, not the previously-assumed
  `{ message, code, fields }` — see `src/api/errors.ts` and
  `src/api/client.ts`.
- Login-specific copy distinguishes what the backend says IS
  distinguishable (403 = account locked, 15-minute lockout — shown
  plainly) from what it deliberately ISN'T (401 covers wrong tenant,
  wrong email, or wrong password, all with identical copy, since the
  backend intentionally returns the same error for all three).

**What `email` on the `User` object actually is:** the backend returns
**no user object at all** from login/signup/refresh — only
`{ accessToken, refreshToken }`. `User.email` in this codebase is
captured from the login/signup form input at the moment the person typed
it, purely for display (e.g. the nav bar). It is **not** returned or
verified by the backend — see `src/types/user.ts`'s docstring. Do not
add `name`, `phone`, or other fields back to `User` without a real
backend endpoint that returns them.

**A real bug this pass found and fixed:** `src/api/client.ts`'s URL
builder used `new URL(path, base)` with a leading `/` on every request
path. Per URL resolution rules, a leading slash makes the path
absolute-from-origin, which **silently discarded the entire base path**
(`/api` or `/api/v1`) on every single request since the very first
version of this client. Nothing caught it because no test asserted the
final URL string until `tests/api/client.test.ts` was added. Fixed in
`buildUrl()`; regression-tested directly.

**KNOWN GAP, unchanged:** tokens are held in memory only
(`state/authStore.ts`); a hard page refresh logs the user out, since the
backend confirms it uses no cookies (`FRONTEND_API_CONTRACT.md` §7) and
there's no session-bootstrap endpoint to lean on. This is a deliberate,
documented trade-off, not an oversight.

Supported roles (confirmed exact enum, case-sensitive):
`RETAILER`, `DISPATCHER`, `RIDER`, `SUPPORT_ADMIN`, `MANAGER_ADMIN`,
`SYSTEM_ADMIN`. Only `MANAGER_ADMIN` is reachable via self-service
sign-up; every other role requires an authenticated admin to create it
via `POST /admin/users` (no UI built for that yet — see §13). There is
no plain `'ADMIN'` value anywhere.

## 9. Real-time — what's real vs. assumed

`src/realtime/RealtimeTransport.ts` defines a transport-agnostic
interface (`connect`, `disconnect`, `subscribe`, connection-state
listeners) and an event contract (`delivery.assigned`,
`delivery.status_changed`, `rider.location_updated`). **The only
implementation that exists is a no-op transport** — it never fires
events. Screens that use `useRealtimeEvent`/`useRealtimeConnectionState`
(dispatcher queue, retailer tracking) are written to work correctly with
zero events, since the dispatcher queue also polls every 15s as an MVP
fallback (see `useDispatcherDeliveries`).

**To swap in a real transport:** once Socket.IO/SSE/polling is confirmed
with the backend, implement a concrete class satisfying `RealtimeTransport`
and change the factory in `getRealtimeTransport()`. No call site changes.

## 10. Maps — what's real vs. assumed

`src/maps/MapView.tsx` is a **placeholder only**. With no
`VITE_MAPS_PROVIDER` set, it renders a labeled empty state showing how
many markers it was given. No Google Maps/Mapbox/MapLibre SDK is
integrated — that's blocked on the provider ADR (see §12). The
`MapMarker`/`MapRoute` prop contract is designed to survive that swap
without changing call sites in `features/dispatcher`, `features/retailer`,
or `features/rider`.

## 11. Error / loading / offline states

Every data-fetching screen handles: loading (skeletons, matched to real
row shape), empty (specific copy, e.g. "You have no active deliveries."),
error (plain-language via `API_ERROR_MESSAGES`), and for the rider app,
offline/stale (via `placeholderData` + `ConnectionBanner` +
`state/pendingActionsStore.ts`).

**The dispatcher assignment 409-conflict flow is implemented** exactly as
specified: on conflict, the UI shows "this was just updated elsewhere,"
refetches the authoritative delivery, and never applies the attempted
assignment optimistically. See `useAssignDelivery` and
`DeliveryDetailDrawer`, and the test in
`tests/features/dispatcher/DeliveryDetailDrawer.test.tsx`.

**Rider offline actions are queued, not silently dropped or faked as
successful.** A status-update that fails with a `NETWORK_ERROR` is
recorded in `pendingActionsStore` and shown as "hasn't synced yet."
**Not yet implemented:** automatic retry/drain of that queue on
reconnect — the retry/backoff policy hasn't been decided (see §12).

## 12. Backend Dependencies / API Questions

**Authentication is fully confirmed**, not open — see §8 and
[`docs/FRONTEND_API_CONTRACT.md`](docs/FRONTEND_API_CONTRACT.md), generated
directly from real backend source. `services/authService.ts`, `api/errors.ts`,
`api/client.ts`, and every auth screen have been rewritten to match it
exactly. Nothing in the auth flow is "provisional" anymore.

**Deliveries/dispatch/riders/vehicles are confirmed by the SAME document
but NOT YET reconciled in this codebase** — see
[`docs/api-contract.md`](docs/api-contract.md) for the specific,
itemized list of known discrepancies (assign is `PATCH` not `POST`,
status transitions use a `toStatus` field not `status`, proof-of-delivery
is a two-step request/confirm flow, pagination is cursor-based not
page-based, delivery creation needs an `Idempotency-Key` header, and
more). This is flagged, tracked, and deliberately out of scope for the
auth-contract-alignment pass that fixed everything else in this
section — treat `services/deliveryService.ts`, `riderService.ts`, and
`vehicleService.ts` as still reflecting the old, partially-wrong proposal
until that follow-up happens.

**Genuinely still open** (not answered by either contract document):

- **Dispatch recommendation:** will the backend ever supply a recommended
  rider/vehicle for a delivery? `FRONTEND_API_CONTRACT.md` does confirm a
  `GET /deliveries/:id/candidates` → `RankedCandidate[]` endpoint exists —
  this is now answerable and should inform `DeliveryDetailDrawer`'s
  design once the delivery-service reconciliation happens.
- **Realtime transport:** Socket.IO, SSE, or none for MVP?
  `FRONTEND_API_CONTRACT.md` §10/§11 explicitly lists "any real-time/
  WebSocket transport" under NOT IMPLEMENTED — so for now, polling (as
  the Dispatch Center already does) is the only option, not a stopgap
  awaiting a transport decision.
- **Map provider:** Google Maps, Mapbox, or MapLibre? Still an open
  product/cost decision, unrelated to either contract doc. See §10.
- **Payment rail:** `FRONTEND_API_CONTRACT.md` §10/§11 confirms there is
  **no payments endpoint at all** yet — this is now a confirmed backend
  gap, not an open question about which rail to use.
- **Proof of delivery mechanism:** confirmed to be a token-based
  request/confirm flow (`POST .../proof-of-delivery/request` then
  `POST .../proof-of-delivery/confirm`), but whether that token is
  surfaced to the customer as an OTP, QR code, or something else is a
  product decision the contract doc doesn't make.
- **Rider location data:** `FRONTEND_API_CONTRACT.md` confirms there is
  **no tracking/location endpoint** yet — also now a confirmed gap, not
  an open question about GPS precision.
- **OpenAPI spec:** confirmed to exist and be live —
  `http://localhost:3000/api/docs` — once backend work resumes locally,
  generating frontend types from it is a reasonable follow-up to retire
  more of the hand-maintained typing in `src/types/`.

**Local dev environment constraint:** this frontend was built and
verified on Windows 10 without Docker — plain Node.js/npm only, no
containerization required for the frontend itself.

Auth-related files no longer carry `PROVISIONAL` markers (see §8). Files
still carrying them are exclusively in the delivery/dispatch/rider/vehicle
area flagged above — search `src/services/` and `src/types/` for
`PROVISIONAL` to find exactly what's still open there.

## 13. Implemented / Planned / Backend-dependency / To-be-decided

**IMPLEMENTED**
- Vite + React + TypeScript (strict) project scaffold, path alias (`@/`)
- Full Reflex design system: graphite/olive/amber/teal/crimson/wine
  palette, semantic CSS custom-property tokens, typography scale, spacing
  scale, glass-pearl surfaces, animation tokens — see
  [`docs/design-system.md`](docs/design-system.md)
- Centralized API client with timeout, auth-header injection boundary,
  silent 401→refresh→retry (deduplicated across concurrent requests),
  normalized `ApiError` categories matching the confirmed
  `{ error: { code, message, requestId } }` envelope, and a fixed
  URL-building bug that previously discarded the API base path on every
  request (see §8)
- Auth: split-composition Sign In page (glass-pearl card,
  `tenantSlug`/`email`/`password` fields, password show/hide,
  role-based post-login routing decoded from the JWT, login-specific
  error copy for 401/403/network) plus a Sign Up page that creates a new
  organization (`organizationName`/`tenantSlug`/`email`/`password`/
  `acceptedTerms`) whose first user is always `MANAGER_ADMIN` — no
  client-side role selection, matching the confirmed backend contract —
  logout (sends the current refresh token), protected routes, role-aware
  routing, unauthorized/not-found pages. No `GET /auth/me` call anywhere
  — confirmed not to exist; session identity is decoded from the access
  token's JWT payload instead (`src/utils/jwt.ts`)
- Retailer: dashboard (StatCard metrics from real pagination counts,
  active/recent lists), create delivery (validated form), confirmation,
  tracking (map placeholder + timeline), paginated history
- Dispatcher: dispatch center (tabs, map placeholder, riders/vehicles
  panels), delivery detail drawer with assignment + 409-conflict handling,
  incidents/exceptions view
- Rider: assigned deliveries (offline-tolerant via cached placeholder
  data), delivery details with status-advance action, proof-of-delivery
  capture (placeholder mechanism), incident reporting, persistent
  connection banner with offline/reconnected states
- 20 shared components (Button [5 variants], Input, Select, Modal, Card
  [+glass variant], Badge, StatusIndicator, Timeline, Alert, Toast,
  Skeleton, DataTable, Pagination, Drawer, Navigation, Sidebar, EmptyState,
  ErrorState, PageHeader, StatCard)
- Role-identity accents (olive/teal/amber/wine) applied consistently in nav
  — see [`docs/design-system.md`](docs/design-system.md) §8
- Stylized, intentional map placeholder (grid + route lines + markers) —
  not a plain empty box, still honestly labeled as a placeholder
- Realtime and Maps integration boundaries (interfaces + no-op/placeholder
  implementations)
- 56 passing tests across 12 files (Vitest + React Testing Library):
  protected/role routing, form validation, loading/empty/error states,
  the 409 assignment-conflict flow, StatusIndicator label/accessibility
  behavior, direct tests of the API client's error-envelope parsing and
  URL construction against the confirmed contract (including the
  base-path regression test), JWT-decode tests, a full Sign In suite
  (renders, validation including tenant-ID format, loading, 401/403/
  network error mapping, exact-payload assertion, role-based redirect
  for two different roles, password-visibility toggle, keyboard
  reachability), a full Sign Up suite (no role selector present,
  organization-ID format and password-length validation,
  password-mismatch rejection, required-consent-checkbox enforcement,
  exact-payload assertion — confirms no `role`/`businessName`/
  `organizationCode`/`confirmPassword` ever gets sent, 409 "already
  taken" mapping, routes to `/admin` post-signup, link back to Sign In),
  and a legal-pages suite asserting every draft-status warning renders
- Verified: `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run build` all pass clean as of this commit

**PLANNED (near-term, not yet built)**
- **Reconciling `deliveryService.ts`/`riderService.ts`/`vehicleService.ts`
  against the now-confirmed contract** (`docs/FRONTEND_API_CONTRACT.md`) —
  the specific known discrepancies are itemized in `docs/api-contract.md`.
  This is the most consequential item in this list; auth was fixed first
  because it was the explicit ask, not because it's more important than
  this.
- Automatic retry/drain of the rider's offline pending-actions queue on
  reconnect (policy TBD)
- Telemetry/error reporting beyond the console-level `ErrorBoundary`
- E2E tests (Playwright) for the full cross-role critical flows listed in
  the engineering spec
- Visual/manual QA pass beyond component-level testing
- A true Dispatcher mobile experience (currently desktop/tablet-only by
  design — see docs/ux-guidelines.md §8)
- Standalone Dispatcher nav items for Deliveries/Riders/Vehicles (today
  these are panels inside Dispatch Center, not separate routes — adding
  nav items without real destinations was avoided; see
  docs/ux-guidelines.md §2)
- Full Admin screens (Overview/Users/Tenants/Audit Logs/System, plus an
  invite-a-user UI for `POST /admin/users`) — only routing/layout
  placeholder exists
- Reconsider whether tokens should be persisted client-side (and how) now
  that the backend confirms no cookie mechanism exists — currently
  deliberately memory-only (see §8's KNOWN GAP)

**BACKEND DEPENDENCY (confirmed gaps — not "unconfirmed," genuinely absent per `FRONTEND_API_CONTRACT.md`)**
- Realtime/WebSocket transport — confirmed not implemented at all
- Payments endpoint — confirmed not implemented at all
- Tracking/location endpoint — confirmed not implemented at all
- Password-reset, email-verification, and MFA flows — confirmed not implemented
- A dedicated stats/aggregate endpoint (dashboard metrics currently derive
  from the real paginated list endpoint's totals per status filter —
  honest but an extra request per metric; see docs/ux-guidelines.md §3)

**TO BE DECIDED (product/team ADR needed, not backend-blocked)**
- Map provider (Google Maps vs. Mapbox vs. MapLibre)
- OpenAPI-generated types vs. continued hand-maintenance (an OpenAPI UI is
  confirmed live at `http://localhost:3000/api/docs` once the backend is
  running, so this is now actionable whenever someone picks it up)
- Whether a minimal Support Admin view gets pulled into MVP
- How proof-of-delivery's confirmed token-based flow should surface to a
  customer (OTP display, QR code, something else)

## 14. Security constraints (enforced in this codebase)

- No secrets committed; `.env.example` has placeholders only, `.env*` is
  gitignored.
- No direct DB/ORM/queue access anywhere in `src/`.
- Frontend role checks (`ProtectedRoute`, `RoleRoute`) are documented in
  their own files as UX-only — never treat them as authorization.
- No `dangerouslySetInnerHTML` anywhere in the codebase.
- Auth token is never logged; `ApiError` messages never echo raw tokens or
  payment details.
- Tenant ID is read from the authenticated user's session
  (`User.tenantId`) — there is no UI control anywhere that lets a user set
  or switch their own tenant.

## 15. Accessibility

`Input`/`Select` associate labels via `htmlFor`/`id` and wire errors via
`aria-describedby` + `aria-invalid`. `StatusIndicator` pairs every status
color with a text label — color is never the only signal. `Modal`/`Drawer`
use `role="dialog"` + `aria-modal` and close on Escape. Interactive
elements use visible `focus-visible` outlines rather than suppressing
them.

## 16. Testing

Vitest + React Testing Library, configured in `vitest.config.ts` /
`tests/setup.ts`. Run `npm test`. Tests intentionally assert on
user-visible behavior (redirects, rendered copy, disabled buttons, mock
call arguments) rather than "the component renders" — see
`tests/features/dispatcher/DeliveryDetailDrawer.test.tsx` for the fullest
example (the 409-conflict flow end to end), and
`tests/features/auth/LoginPage.test.tsx` for the Sign In suite (loading,
error-mapping per category, role-based redirect for two roles, password
toggle, keyboard reachability).

**Visual QA performed:** `npm run build` was verified to succeed and
produce a working bundle; component-level tests confirm behavior (not
appearance) across loading/empty/error states. **Visual QA NOT performed:**
no manual/screenshot-based review across the breakpoints listed in the
original brief (320/375/768/1024/1280/1440px) or cross-browser check —
that requires a running instance and a person looking at it, which wasn't
done here. Treat the visual design as implemented-and-typechecked, not
visually verified end-to-end.

## 17. How to add a feature

1. Decide which existing `features/<role>/` folder it belongs to, or
   create a new one — don't add domain logic to `pages/` or `components/`.
2. If it needs backend data: add a method to the relevant
   `services/<resource>.ts` (create one if it doesn't exist), typed
   against `types/`. Never call `fetch`/`api/client.ts` directly from the
   feature.
3. Wrap the service call in a TanStack Query hook inside the feature
   folder (see `useRetailerDeliveries.ts` for the query-key convention).
4. Build the screen using existing `components/` primitives; add a new
   shared component only if a second role will plausibly need it too.
5. Handle loading/empty/error states explicitly — don't ship a screen that
   only handles the success path.
6. Wire the route into `routes/index.tsx` under the correct `RoleRoute`.
7. Write at least one test that exercises real behavior (not just "it
   renders").
8. If anything about the backend contract is unconfirmed, mark it
   `PROVISIONAL`/`BACKEND DEPENDENCY` in a code comment and add it to §12
   of this README.

## 18. Legal documents

Four public routes render legal/policy content: `/privacy`, `/terms`,
`/rider-agreement`, `/retailer-agreement`. The Sign Up form (`/signup`)
requires checking a consent box linking to the relevant documents before
an account can be created (Retailer signup links Terms + Privacy +
Retailer Agreement; Dispatcher/Rider signup links Terms + Privacy + Rider
Agreement).

**These are drafts, not legal advice, and not reviewed by a lawyer.**
Every page renders a prominent "draft — not yet legally reviewed" banner
(`LegalLayout`'s `draftNotice` prop) — a test in
`tests/pages/legal/legalPages.test.tsx` exists specifically to catch that
banner ever being silently removed. Do not treat any of this content as
finished or ship it to real users without actual legal review.

The Privacy Policy was written to reflect what this specific app's code
actually collects (see `src/types/*.ts`), not generic boilerplate — but
still has open questions inline (e.g. background location tracking,
payment provider data sharing) that need product/legal decisions.

**The Rider Agreement is deliberately incomplete.** Its two highest-risk
sections — rider classification (contractor vs. employee under Kenyan
labor law) and liability for injury/accidents — are left as flagged open
questions rather than filled in with plausible-sounding text, because
getting either wrong has real financial and legal consequences. Do not
"helpfully" complete these sections without a lawyer familiar with
Kenyan labor and liability law; a test in `legalPages.test.tsx` asserts
both are still flagged as open, specifically so this can't regress
silently.

## 19. Git workflow

Small, focused branches (e.g. `feature/retailer-delivery-form`), one
concern per PR, no unrelated file changes. State any API assumption your
PR makes explicitly in the PR description so it can be checked against
what the backend actually ships. Run `npm run typecheck && npm test`
before requesting review.
