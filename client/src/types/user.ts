import type { Id } from "./common";

/**
 * Exact enum per FRONTEND_API_CONTRACT.md §5 (Prisma `UserRole`) — these
 * strings are case-sensitive and confirmed against the backend schema.
 * There is no plain `"ADMIN"` value.
 */
export type UserRole =
  | "RETAILER"
  | "DISPATCHER"
  | "RIDER"
  | "SUPPORT_ADMIN"
  | "MANAGER_ADMIN"
  | "SYSTEM_ADMIN";

export const MVP_ROLES: readonly UserRole[] = ["RETAILER", "DISPATCHER", "RIDER"];

export const ADMIN_ROLES: readonly UserRole[] = [
  "SUPPORT_ADMIN",
  "MANAGER_ADMIN",
  "SYSTEM_ADMIN",
];

/**
 * CONFIRMED SHAPE, not a guess (FRONTEND_API_CONTRACT.md §4): no backend
 * endpoint returns a full User object. Login, signup, and refresh return
 * only `{ accessToken, refreshToken }` — nothing else. `id`, `tenantId`,
 * and `role` come from decoding the access token's JWT payload
 * (src/utils/jwt.ts), which is the ONLY source for them.
 *
 * `email` is NOT returned by the backend anywhere. When present here, it
 * was captured from the login/signup form input itself at the moment the
 * user typed it — it is unverified, display-only, and must never be
 * treated as authoritative (e.g. never sent back to the backend as if it
 * were confirmed identity data).
 *
 * Do not add `name`, `phone`, or `createdAt` back to this type — the
 * backend has no endpoint that returns them for the authenticated user
 * (see contract doc §4). If a screen needs to show more identity detail
 * than this, that's a real backend gap to raise, not something to
 * fabricate on the frontend.
 */
export interface User {
  id: Id;
  tenantId: Id;
  role: UserRole;
  /** Client-captured at login/signup time — NOT returned by the backend. See docstring above. */
  email?: string;
}
