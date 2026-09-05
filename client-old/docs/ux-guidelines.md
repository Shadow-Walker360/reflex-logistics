# Reflex Logistics — UX Guidelines

Companion to `docs/design-system.md`. That document covers *what things
look like*; this one covers *how the experience behaves* — navigation
logic, workflow structure, and the rules for loading/error/empty states.
Same rule applies: everything here describes code that exists in
`client/src`, not aspiration.

---

## 1. Role experiences

Reflex has three fully-built role experiences and one placeholder:

- **Retailer** — mobile + desktop. Create a delivery, track it, see
  history. Lowest information density of the four.
- **Dispatcher** — desktop/tablet-optimized. Highest information density:
  a three-column Dispatch Center (queue, map, riders/vehicles) plus an
  incidents view.
- **Rider** — mobile-first, single column, designed around poor/unstable
  connectivity.
- **Admin** (`SUPPORT_ADMIN`/`OPERATIONS_ADMIN`/`SYSTEM_ADMIN`) — routing
  and layout scaffolding only. No real screens. See client/README.md §13.

## 2. Navigation principles

- Navigation always shows which workspace you're in (role-identity accent
  dot, §8 of the design system) and which section you're in (active-state
  styling — background + bold text + a left accent bar on desktop
  sidebars, never color alone).
- **A nav item only exists if its destination is real.** The Dispatcher
  brief calls for Deliveries/Riders/Vehicles as separate nav entries;
  today those are panels inside the Dispatch Center, not standalone
  routes, so the nav only lists "Dispatch Center" and "Incidents" — the
  two real destinations. Adding nav items that point nowhere would create
  dead links, which is worse than an incomplete nav. See client/README.md
  §13 "PLANNED" for what would need to exist first.
- Retailer and Dispatcher use persistent top-level nav (top bar / sidebar)
  since their workflows involve jumping between a handful of sections.
  Rider does not — its workflow is linear (see §4), so there's nothing to
  switch between beyond "today's list" and "the delivery I'm on."

## 3. Dashboard hierarchy

Every dashboard follows the same vertical structure (`RetailerDashboardPage`
is the reference implementation):

```
PageHeader (title + context + primary action)
  ↓
Key metrics (StatCard row — a handful of numbers, not one giant card each)
  ↓
Operational activity (the actual list: active deliveries, queue, etc.)
  ↓
Recent events / secondary context
```

Metrics are **real numbers from the backend's pagination envelope**
(`totalItems` for a given status filter), not fabricated aggregates —
see `useDeliveryCount` in `features/retailer/useRetailerDeliveries.ts`.
There is no dedicated stats/aggregate endpoint confirmed with the backend
yet (client/README.md §12), so today's approach is "ask the real list
endpoint for a count," which is honest but means an extra small request
per metric. A dedicated stats endpoint is a reasonable backend ask if
dashboard metrics grow beyond four numbers.

## 4. Delivery workflow

**Retailer:** Login → Dashboard → Create Delivery → Confirmation → Tracking
→ History. Linear, but each step remains reachable independently (you can
jump straight to History from the top nav).

**Dispatcher:** the workflow isn't a sequence, it's continuous triage — the
Dispatch Center's tab structure (Unassigned/Assigned/In Transit/Exceptions)
represents that: a dispatcher lives on one screen and switches queues
constantly rather than moving between pages.

**Rider:** Login → Assigned Deliveries → Delivery Details → status-advance
actions → Proof of Delivery. Strictly linear and mobile — there is no
persistent nav because there's nothing to jump between; "Report an issue"
and "Confirm delivery" are always reached from the specific delivery, never
as standalone destinations.

## 5. Error handling

Every screen that fetches data distinguishes **error** (the request
failed) from **empty** (the request succeeded and there's genuinely
nothing there) — these are different components (`ErrorState` vs.
`EmptyState`) with different visual treatment (crimson-tinted vs. neutral)
because they mean different things to the user.

`ErrorState` always answers two questions: what happened (a specific
title, e.g. "Unable to load deliveries," never a bare "Error") and what
you can do about it (a "Try again" button wired to the query's `refetch`).
It never shows a raw HTTP status code or backend stack trace — copy comes
from `API_ERROR_MESSAGES` (`src/api/errors.ts`), which maps each
normalized error category to plain language.

**The dispatcher assignment 409-conflict flow** is the sharpest example of
this principle in the app: if two dispatchers try to assign the same
delivery, the loser sees "this was just updated elsewhere," the UI
refetches the authoritative delivery, and the drawer reflects the real
(now-assigned-elsewhere) state — it never shows the attempted assignment
as if it succeeded. See `DeliveryDetailDrawer` and its test.

## 6. Loading behavior

Loading states are shaped to match the content they're replacing
(`DeliveryRowSkeleton`, `StatCardSkeleton`) so nothing jumps when real data
arrives. A screen with existing cached data (e.g. the rider's delivery
list while reconnecting) keeps showing that data with a small "showing
last known data" banner rather than blanking to a spinner — losing
already-fetched information on a transient failure is a worse experience
than showing slightly stale data with an honest label.

## 7. Empty states

Every empty state names what's missing and, where there's an obvious next
action, offers it:

- No active deliveries → "You have no active deliveries." + a "Create a
  delivery" button
- No assigned deliveries (rider) → "You're all clear" / "No deliveries are
  currently assigned to you."
- No incidents → "No active incidents"

Never a bare "No data."

## 8. Mobile strategy

Rider is mobile-first by construction — single column, large tap targets,
a persistent connection banner, and status-advance actions that queue
locally rather than fail silently when offline
(`state/pendingActionsStore.ts`). Retailer works down to a phone screen
but its primary design target is "works well on both." Dispatcher is not
designed for mobile at all — its three-column layout assumes desktop/tablet
width, per the brief's explicit instruction that dispatcher workflows are
desktop-heavy. There is currently no dispatcher mobile fallback; that's a
deliberate scope choice, not an oversight, and would need its own design
pass (a simplified mobile dispatcher view is a different information
architecture, not a responsive reflow of the three-column one).

## 9. Authentication UX

- **Loading:** the submit button shows a spinner and "Signing in…" text,
  and is disabled for the duration — prevents double-submission.
- **Invalid credentials (401):** "Your email or password is incorrect." —
  distinct from the app-wide session-expired copy used elsewhere for the
  same HTTP status, because a failed login attempt and an expired session
  are different situations that happen to share a status code. See
  `LOGIN_ERROR_MESSAGES` in `LoginPage.tsx`.
- **Forbidden (403):** "You don't have permission to access this
  workspace."
- **Network failure:** "We couldn't connect to Reflex. Check your
  connection and try again."
- **Validation:** inline, per-field, before any request is sent.
- **Success:** routes immediately to the authenticated user's role home
  (`homeRouteForRole`) — no intermediate "success!" screen, since the
  destination screen itself confirms success.
- **What's intentionally absent:** "remember me" and "forgot password."
  Neither is a confirmed backend capability (client/README.md §12), and
  the brief is explicit that unsupported capabilities should not be
  faked. Both should be revisited once the backend's auth contract is
  confirmed.

## 10. Realtime / connection UI

The rider app's `ConnectionBanner` distinguishes exactly two states today:
**offline** (amber banner, persistent, explains that actions will sync
later) and **just reconnected** (teal banner, auto-dismisses after 2.5s).
There is deliberately no "connecting…"/"reconnecting…" state modeled,
because there is no live realtime transport to be mid-connection to yet
(`src/realtime/RealtimeTransport.ts` is a no-op — see client/README.md
§9). A brief network blip never renders as an alarming full-danger
banner — offline is treated as an expected, recoverable condition for a
rider on the move, not an error.
