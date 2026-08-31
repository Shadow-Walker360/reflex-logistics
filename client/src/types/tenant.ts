import type { Id } from "./common";

/**
 * Tenant context. The frontend never lets a user choose their tenantId —
 * this is always read from the authenticated session (see User.tenantId
 * and src/features/auth). A tenantId appearing anywhere in client state
 * or a URL is advisory/display-only, never a security boundary
 * (Section 8 of the frontend spec).
 */
export interface Tenant {
  id: Id;
  name: string;
}
