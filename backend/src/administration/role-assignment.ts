import { RoleName } from '../auth/types/auth.types';

/**
 * Spec reference: Section 7 (Authorization/RBAC). `SYSTEM_ADMIN` is
 * cross-tenant platform administration - nothing a tenant's own
 * MANAGER_ADMIN does should be able to grant it, even to themselves,
 * since that would let any self-service-signed-up organization (ADR-012)
 * escalate into platform-wide access. Every other role is tenant-scoped
 * and safe for a tenant's own admin to assign.
 *
 * Pulled out as a standalone pure function (no Prisma/NestJS dependency)
 * so the rule is independently unit-testable, following the same pattern
 * as scrub-audit-context.ts, vehicle-eligibility.ts, and proof-token.ts.
 */
const ASSIGNABLE_ROLES: RoleName[] = [
  'RETAILER',
  'DISPATCHER',
  'RIDER',
  'SUPPORT_ADMIN',
  'MANAGER_ADMIN',
];

export function isAssignableRole(role: string): role is RoleName {
  return ASSIGNABLE_ROLES.includes(role as RoleName);
}
