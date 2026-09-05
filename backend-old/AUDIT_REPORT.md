# Northstar Backend — Engineering Audit Report

**Audit date:** 2026-08-14
**Scope:** `/backend` as delivered in the previous turn
**Method:** Static trace of every module (controller → service → repository → Prisma → DB), live command execution where the sandbox allowed it, and explicit `NOT VERIFIED` labeling where it didn't.

## Executive Summary

> **REQUIRES CHANGES**

Not approved for production. There is one confirmed **authentication bypass** that lets any caller impersonate a rep and read any customer's order data with no credential check, plus a **Prisma schema defect** that will fail `prisma generate`/`migrate` outright. Neither is hypothetical — both were confirmed by direct inspection, not inferred from filenames.

Full disclosure on my own prior claim: last turn I said the request pipeline was "tested end-to-end." That was true for HTTP wiring (routing, validation, rate-limit headers, error shapes) against a **hand-mocked** Prisma client. It was never true for the actual database layer, the actual test suite, or the actual Prisma schema — none of those were exercised. This audit closes that gap honestly.

---

## Critical Findings

**C-1 — Rep authentication is not actually verified (auth bypass)**
- **Location:** `src/middleware/auth.js`, `verifyRepToken()`
- **Problem:** The function accepts *any* string of the form `rep:<anything>` (length > 10) as a valid rep session, regardless of `REP_SESSION_SECRET`. Confirmed by `grep -rn REP_SESSION_SECRET src/` — it's declared as required in `config/index.js` (boot fails without it) but is **never used to cryptographically verify anything**. The one place it's referenced (`auth.js:54`) only guards against someone sending the raw secret as their own token — it does not check tokens *against* the secret.
- **Evidence:** `curl -H "Authorization: Bearer rep:attacker@evil.com" GET /api/orders/NS-10492` succeeds as a REP actor with zero verification, per the code path traced in `identifyActor` → `verifyRepToken`.
- **Why it matters:** This is the exact control that's supposed to gate "skip the customer email check + log a real rep's access" for PII. As written, anyone can grant themselves that access with a two-second guess at the token format.
- **Recommended fix:** Do not ship this middleware live behind any reachable URL until real SSO/JWT verification replaces the stub. If a stub must exist for local dev, gate it behind `NODE_ENV === 'development'` explicitly and hard-fail in staging/production if no real verifier is configured.
- **Risk if ignored:** Full unauthorized access to all customer order data.

**C-2 — Prisma schema has an unpaired relation; will fail `prisma validate`/`generate`**
- **Location:** `prisma/schema.prisma` — `Order.auditLogs LookupAuditLog[]` vs. `LookupAuditLog.orderId String?`
- **Problem:** `Order` declares a relation list `auditLogs LookupAuditLog[]`, but `LookupAuditLog` has no corresponding `@relation` field — `orderId` is a bare scalar. Prisma requires both sides of a relation to be declared; this schema is structurally invalid.
- **Evidence:** Manual schema inspection (I could not run `prisma validate` — see Migration Result below — but this is a well-defined, unambiguous rule in Prisma's schema language, not a judgment call).
- **Why it matters:** `npm run prisma:generate` and `npm run prisma:migrate` will not run at all. This isn't a runtime bug, it's a "the project cannot be built" bug.
- **Recommended fix:** Make it a real optional relation:
  ```prisma
  model LookupAuditLog {
    orderId String?
    order   Order?  @relation(fields: [orderId], references: [id], onDelete: SetNull)
    ...
  }
  ```
  `onDelete: SetNull` (not `Cascade`) is deliberate — deleting a cached order should never delete its audit trail.
- **Risk if ignored:** Project doesn't build.

**C-3 — No migrations exist**
- **Location:** `prisma/migrations/` (empty)
- **Problem:** `prisma migrate dev` was never actually run against a real database — I don't have one in this sandbox, and generating the Prisma engine binaries requires reaching `binaries.prisma.sh`, which isn't on the sandbox's network allowlist. The schema has **never been proven to build a real Postgres database**, including before this audit.
- **Evidence:** `ls prisma/migrations/` → empty directory. `npx prisma generate` → `403 Forbidden` fetching engine binaries (confirmed command output).
- **Why it matters:** Combined with C-2, the honest status is "this schema has never successfully touched a database." That must happen — on your machine, with real network access — before anything else here can be trusted.
- **Recommended fix:** Fix C-2 first, then run `npx prisma migrate dev --name init` against a real (even disposable/local) Postgres instance and commit the generated migration.
- **Risk if ignored:** No way to know if the schema is deployable until someone tries it for the first time in a real environment.

**C-4 — Test suite does not currently run**
- **Location:** `npm test`
- **Problem:** Fails immediately — confirmed by running it — because `@prisma/client` was never generated (blocked by C-3's network issue). The single integration test file that exists has never actually executed against a real database.
- **Evidence:** `npm test` output: `not ok 1 - tests/integration/orders.test.js ... code: 'ERR_TEST_FAILURE'`.
- **Recommended fix:** Once C-2/C-3 are resolved on a machine with real DB + network access, re-run `npm test` and treat a clean pass as the actual bar, not the syntax-check-only verification I did here.
- **Risk if ignored:** Zero verified test coverage, despite test files existing (existence ≠ correctness, per the audit brief).

---

## High Findings

**H-1 — Race condition on return creation (double-refund risk)**
- **Location:** `src/modules/returns/returns.service.js`, `initiateReturn()`
- **Problem:** `findExistingReturn()` → `createReturn()` is a check-then-act pattern with no transaction, row lock, or unique constraint. Two concurrent `POST /api/returns/NS-10492` requests can both pass the "no existing return" check before either writes, producing two `Return` rows for one order — real money risk given `refundAmountCents`.
- **Recommended fix:** Add a partial unique index (e.g. `@@unique([orderId])` if only one return per order is ever allowed, or a raw-SQL partial unique index on `orderId WHERE status != 'DENIED'` if denied returns should be resubmittable) and let the database reject the second write, rather than relying on an application-level check.
- **Risk if ignored:** Duplicate return/refund records under concurrent submission (e.g. accidental double-click, retried requests).

**H-2 — Return creation and its audit log write aren't atomic**
- **Location:** `returns.service.js` — `createReturn()` then `logReturnInitiated()` as two separate calls
- **Problem:** If the audit-log write fails after the return is created, you have a real return with no audit trail — the exact compliance gap the audit log exists to prevent.
- **Recommended fix:** Wrap both in `db.$transaction(...)`.
- **Risk if ignored:** Silent audit gaps under partial failure.

**H-3 — Audit log has a blind spot for lookups on nonexistent order IDs**
- **Location:** `orders.service.js`, `getCachedOrRefresh()` throws before `getOrderForActor()` ever calls `repo.logLookup()`
- **Problem:** The schema's own comment says `orderId` is nullable specifically "to log the attempt" when an order doesn't exist — but no code path does this. An attacker enumerating order IDs that don't exist at all leaves **zero audit trail**, while enumerating IDs that exist with a wrong email does.
- **Recommended fix:** Catch the not-found case in `getOrderForActor` (or before it) and write a `LookupAuditLog` row with `orderId: null` before re-throwing.
- **Risk if ignored:** Incomplete audit trail exactly where enumeration attempts are most likely to show up.

**H-4 — Rate limiter store is in-memory only (won't survive horizontal scaling)**
- **Location:** `src/middleware/rateLimiter.js`
- **Problem:** `express-rate-limit` defaults to an in-process `MemoryStore`. The moment this runs as more than one instance — which is the normal shape of "scale this later" — each instance tracks its own counters, so the real effective limit becomes `limit × instance count`, silently.
- **Recommended fix:** Before horizontal scaling, swap to a shared store (`rate-limit-redis` backed by a small Redis instance, or Neon-backed if you want to avoid adding infra). Flagging now since this was explicitly asked about.
- **Risk if ignored:** Rate limiting silently stops being enforced at the advertised limit once you run more than one instance.

---

## Medium Findings

**M-1 — Thundering herd on cache refresh**
No per-order lock around `getCachedOrRefresh()`. N concurrent requests for the same stale order each independently call the upstream carrier client and run their own delete-then-recreate transaction on `items`/`trackingEvents`. Two consequences: redundant upstream calls (cost, and rate-limit exposure on *your* side against the carrier API), and a narrow window where a concurrent `GET` can observe zero items/tracking events mid-refresh (delete happens before insert, not an atomic swap). *Fix:* dedupe concurrent refreshes for the same `externalOrderId` (in-process promise cache is enough at this scale; a Postgres advisory lock if you're already multi-instance).

**M-2 — `order.returns[0]` has no guaranteed ordering**
`orders.controller.js` reads `order.returns[0]` from an `include: { returns: true }` with no `orderBy`. Prisma does not guarantee array order without one. Combined with H-1, if a duplicate return ever exists, the wrong one could be surfaced to the user. *Fix:* add `orderBy: { initiatedAt: 'desc' }` to both places `returns` is included.

**M-3 — Order-ID existence is disclosed to unauthenticated callers**
`EMAIL_MISMATCH` (403) and `ORDER_NOT_FOUND` (404) are distinguishable responses. An unauthenticated caller can confirm whether a given order ID exists without knowing the associated email. This was a deliberate choice (there's a comment explaining the reasoning), but it was a code-comment decision, not a signed-off one — flagging it so it's a conscious call rather than an assumption.

**M-4 — Dead audit action**
`AuditAction.TRACKING_VIEWED` is defined but no code path ever writes it (tracking data returns inline with the order GET). Either wire it up if tracking views should be logged separately, or remove it — an unused enum value with no consumer is a documentation mismatch waiting to confuse the next engineer.

---

## Low / Observation Findings

- **L-1:** `@@index([externalOrderId])` on `Order` is redundant — the `@unique` constraint already creates an index on that column.
- **L-2:** `@@index([customerEmail])` on `Order` is currently unused by any query (the email check happens in application code post-fetch, not as a query filter). Fine to keep for a future "list orders by email" endpoint, but it isn't load-bearing today — don't assume it's protecting anything yet.
- **L-3:** No `uncaughtException` handler in `server.js` — only `unhandledRejection`. A synchronous throw outside a request context has no controlled shutdown path.
- **L-4:** `app.set('trust proxy', 1)` hardcodes "one hop." Correct for most single-LB/single-CDN deploys, wrong if the real deploy target sits behind more than one proxy — revisit at actual deploy time, not before.
- **L-5:** No `connection_limit` tuning on the Neon pooled `DATABASE_URL`. Fine at current scale; worth setting explicitly once real concurrent-connection numbers are known, rather than trusting Prisma's default.
- **OBSERVATION:** No pagination on any endpoint. Not a defect today (single-record lookups only), but the moment a "list orders" or "list returns" endpoint is added, unbounded `findMany` becomes a real risk — noting so it's not forgotten later.

---

## Database Findings

| Area | Status |
|---|---|
| Schema validity | **FAIL** — unpaired relation (C-2) |
| Foreign keys / cascade | Correct on `OrderItem`, `TrackingEvent`, `Return` → `Order` (`onDelete: Cascade`, appropriate). `LookupAuditLog` → `Order` link is broken (C-2). |
| Unique constraints | `Order.externalOrderId` ✓. Missing on `Return` (H-1) — the one place it actually matters for money. |
| Indexes | Present but one redundant (L-1), one currently unused (L-2). No missing indexes on hot paths identified. |
| Money representation | `refundAmountCents: Int` — correct pattern (integer cents, not float). ✓ |
| Enums vs. free strings | Status fields correctly use enums throughout. ✓ |
| Migrations | **Do not exist.** Never run against a real database (C-3). |

## API Findings

| Area | Status |
|---|---|
| Routes registered | Both `/api/orders/:orderId` and `/api/returns/:orderId` verified mounted and reachable via live boot test. |
| Validation at the edge | Verified live — malformed order ID correctly rejected with 400 before reaching the controller. |
| Error contract consistency | Consistent `{ error: { code, message, requestId } }` shape across all thrown `AppError`s — verified by reading every throw site. |
| Status codes | Correct mapping (400/401/403/404/429/500) confirmed by code inspection; 201 on return creation confirmed. |
| Controllers vs. business logic | Clean — controllers only parse/format, no direct DB or business-rule code found in either controller. |
| N+1 queries | None found — `include` is used correctly to fetch relations in one query rather than looping. |

## Security Findings

| Area | Status |
|---|---|
| Authentication | **FAIL** — C-1, full bypass |
| Authorization (customer vs. rep) | Logic is correctly *structured* (service-layer check, not controller), but meaningless while C-1 stands |
| CORS | Fails closed correctly — empty `ALLOWED_ORIGINS` → `origin: false`, verified by reading `app.js`. Good default. |
| Security headers | `helmet()` confirmed active — verified via live response headers (CSP, HSTS, X-Frame-Options all present in the actual HTTP response captured during boot test). |
| Rate limiting | Present and correctly scoped by actor type (verified live) — but see H-4 for the scaling gap |
| Input validation | Verified live end-to-end for the one case tested (malformed order ID → 400 with field-level detail) |
| Secrets in repo | None found — `.env` is not committed, only `.env.example` with placeholder values |
| Injection risk | None found — all queries go through Prisma's query builder, no raw SQL, no string-concatenated queries anywhere in the codebase |

## Migration Result

```
Fresh database migration:  NOT VERIFIED — ENVIRONMENT LIMITATION (no reachable Postgres, no network access to binaries.prisma.sh)
Prisma validation:         FAIL (by manual schema inspection — see C-2. Could not run the actual `prisma validate` command — same network limitation.)
Prisma generation:         FAIL (confirmed — `npx prisma generate` returned 403 fetching engine binaries)
Seed:                      NOT VERIFIED — blocked by the above
Application startup:       PASS — verified live, but only with a hand-mocked Prisma client (real DB layer unverified)
Integration tests:         FAIL — confirmed, `npm test` exits non-zero (ERR_TEST_FAILURE) because the Prisma client was never generated
```

## Required Fixes Before Approval

1. Fix C-1 (auth bypass) — do not deploy anywhere reachable until real token verification exists.
2. Fix C-2 (schema relation) and actually run `prisma migrate dev` against a real Postgres instance — confirm it builds clean.
3. Fix H-1/H-2 (return race condition + non-atomic audit write) — this touches real refund amounts.
4. Fix H-3 (audit blind spot on nonexistent-order lookups).
5. Decide on H-4 (rate-limit store) before any horizontal scaling — doesn't block a single-instance sprint deploy, but must not be forgotten.
6. Re-run `npm test` against a real database once C-2/C-3 are fixed and treat a genuine pass/fail, not the syntax-check-only verification this audit had access to.
