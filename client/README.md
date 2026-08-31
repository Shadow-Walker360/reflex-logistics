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
| `VITE_API_BASE_URL` | Yes | Backend API origin. App throws at startup if unset. |
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

## 8. Authentication — what's real vs. assumed

**IMPLEMENTED:** `AuthProvider` (session bootstrap on load), `useAuth`,
`ProtectedRoute`, `RoleRoute`, `LoginPage`, logout, role-aware redirect
after login, Unauthorized (403) and Not Found (404) pages.

**ASSUMED / PROVISIONAL** (see Backend Dependencies, §12): the login
payload shape (`identifier` + `password`), Bearer-token header injection,
and `GET /auth/session` for bootstrap. None of this is confirmed against
the real NestJS auth module.

**NOT IMPLEMENTED:** token refresh. The session is held in memory only
(`state/authStore.ts`); a hard page refresh currently logs the user out.
This is a deliberate gap, not an oversight — building a refresh flow
against an unconfirmed token contract would likely need to be redone.

Supported roles: `RETAILER`, `DISPATCHER`, `RIDER` (full screens).
`SUPPORT_ADMIN`, `OPERATIONS_ADMIN`, `SYSTEM_ADMIN` exist in the `UserRole`
type and route tree (`/admin` → `AdminLayout`) as **architectural
placeholders only** — no admin screens are built.

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

Everything below needs backend/team confirmation before the corresponding
frontend code can move from "provisional" to "confirmed." Endpoint paths
and payloads used today are reasonable guesses at REST/NestJS conventions,
not contracts anyone has signed off on.

- **Auth mechanism:** password, OTP, or both? What does `POST /auth/login`
  actually expect/return? Is there a refresh-token flow, and if so, what's
  the storage recommendation (cookie vs. bearer token)?
- **`GET /auth/session`:** does this endpoint exist for session bootstrap
  on page load? What does it return?
- **Delivery state transitions:** does `Delivery` include an
  `availableTransitions` field? Until it does, the rider/dispatcher UIs
  fall back to a hardcoded "likely next status" as a UX default only (see
  `src/utils/deliveryStateMachine.ts` and `RiderDeliveryDetailsPage`'s
  `NEXT_STATUS_LABEL` map) — this is explicitly not authoritative.
- **Dispatch recommendation:** will the backend ever supply a recommended
  rider/vehicle for a delivery (e.g. `delivery.recommendedRiderId`)? No
  such field exists in the `Delivery` type yet, so `DeliveryDetailDrawer`
  has no recommendation UI to show.
- **Realtime transport:** Socket.IO, SSE, or none for MVP? See §9.
- **Map provider:** Google Maps, Mapbox, or MapLibre? Pending ADR (cost vs.
  Kenya address-data quality trade-off). See §10.
- **Payment rail:** is M-Pesa confirmed as the initial payment method? Is
  confirmation webhook-driven or does the frontend need to poll
  `GET /deliveries/:id/payment`? `src/types/payment.ts` and
  `services/paymentService.ts` are written generically so this doesn't
  require a type-shape change once confirmed.
- **Proof of delivery:** which mechanism (OTP, QR, signature, photo) is
  actually being built? `ProofOfDeliveryPage` currently implements a
  generic OTP-style code-entry placeholder as the simplest capture UI to
  swap out.
- **Pagination envelope:** does `GET /deliveries` actually return
  `{ items, page, pageSize, totalItems, totalPages }`? This shape is
  assumed in `types/common.ts` and unverified.
- **Rider location data:** live GPS coordinates or last-known/periodic
  pings? Affects `Rider.location` precision and how often the dispatcher
  map should refetch.
- **OpenAPI spec:** does the NestJS backend expose one? If so, generating
  frontend types from it (see engineering spec §26) is a near-term
  follow-up to reduce the amount of hand-maintained "PROVISIONAL" typing
  currently in `src/types/`.

Every provisional type/service file above has an inline comment marking
it `PROVISIONAL` or `BACKEND DEPENDENCY` at the point of assumption —
search for those terms in `src/` to find every place a confirmed contract
would change something.

## 13. Implemented / Planned / Backend-dependency / To-be-decided

**IMPLEMENTED**
- Vite + React + TypeScript (strict) project scaffold, path alias (`@/`)
- Full Reflex design system: graphite/olive/amber/teal/crimson/wine
  palette, semantic CSS custom-property tokens, typography scale, spacing
  scale, glass-pearl surfaces, animation tokens — see
  [`docs/design-system.md`](docs/design-system.md)
- Centralized API client with timeout, auth-header injection boundary,
  normalized `ApiError` categories
- Auth: redesigned split-composition Sign In page (glass-pearl card,
  password show/hide, role-based post-login routing, login-specific error
  copy for 401/403/network), logout, protected routes, role-aware routing,
  session bootstrap, unauthorized/not-found pages
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
- 27 passing tests across 8 files (Vitest + React Testing Library):
  protected/role routing, form validation, loading/empty/error states,
  error-category normalization, the 409 assignment-conflict flow,
  StatusIndicator label/accessibility behavior, and a full Sign In suite
  (renders, validation, loading, 401/403/network error mapping,
  role-based redirect for two different roles, password-visibility
  toggle, keyboard-reachability of the three key controls)
- Verified: `npm run typecheck`, `npm test`, and `npm run build` all pass
  clean as of this commit

**PLANNED (near-term, not yet built)**
- Automatic retry/drain of the rider's offline pending-actions queue on
  reconnect (policy TBD)
- Telemetry/error reporting beyond the console-level `ErrorBoundary`
- E2E tests (Playwright) for the full cross-role critical flows listed in
  the engineering spec
- Visual/manual QA pass beyond component-level testing (see §20 note below)
- A true Dispatcher mobile experience (currently desktop/tablet-only by
  design — see docs/ux-guidelines.md §8)
- Standalone Dispatcher nav items for Deliveries/Riders/Vehicles (today
  these are panels inside Dispatch Center, not separate routes — adding
  nav items without real destinations was avoided; see
  docs/ux-guidelines.md §2)
- Full Admin screens (Overview/Users/Tenants/Audit Logs/System) — only
  routing/layout placeholder exists

**BACKEND DEPENDENCY (blocked until confirmed — see §12)**
- Real auth contract + token refresh
- `Delivery.availableTransitions`
- Any dispatch-recommendation field
- Realtime transport selection
- Payment rail confirmation
- Proof-of-delivery mechanism
- Pagination envelope shape
- A dedicated stats/aggregate endpoint (dashboard metrics currently derive
  from the real paginated list endpoint's `totalItems` per status filter —
  honest but an extra request per metric; see docs/ux-guidelines.md §3)
- "Remember me" and "forgot password" — not built into the Sign In page
  since neither is a confirmed backend capability (see
  docs/ux-guidelines.md §9)

**TO BE DECIDED (product/team ADR needed, not backend-blocked)**
- Map provider (Google Maps vs. Mapbox vs. MapLibre)
- OpenAPI-generated types vs. continued hand-maintenance
- Whether a minimal Support Admin view gets pulled into MVP

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

## 18. Git workflow

Small, focused branches (e.g. `feature/retailer-delivery-form`), one
concern per PR, no unrelated file changes. State any API assumption your
PR makes explicitly in the PR description so it can be checked against
what the backend actually ships. Run `npm run typecheck && npm test`
before requesting review.
