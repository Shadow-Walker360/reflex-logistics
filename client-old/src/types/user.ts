import type { Id, IsoDateTime } from "./common";

/**
 * MVP operational roles. Administrative roles exist as architectural
 * placeholders only (see Section 5 of the frontend spec) — routes and
 * nav entries for them are scaffolded but no admin screens are built yet.
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
 * PROVISIONAL — the backend's actual auth mechanism (password, OTP, or
 * both) is an open question (see README "Backend Dependencies"). This
 * shape assumes an authenticated user record returned after login/session
 * check; fields beyond id/role/tenantId are a reasonable guess, not a
 * confirmed contract.
 */
export interface User {
  id: Id;
  name: string;
  role: UserRole;
  /** Tenant context as supplied by the backend session — never client-selected. */
  tenantId: Id | null;
  phone?: string;
  email?: string;
  createdAt: IsoDateTime;
}
