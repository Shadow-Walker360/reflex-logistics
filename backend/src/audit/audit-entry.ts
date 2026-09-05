/**
 * Extracted from audit.service.ts specifically so this type can be
 * imported by files that must not transitively pull in AuditService's
 * own PrismaService dependency (which is affected by the Prisma-client-
 * generation blocker - see docs/database.md). ts-jest's default
 * whole-program compilation means importing anything from a file with a
 * compile error fails the entire test suite, even for an unrelated type
 * import - see the comment in dispatch/dispatch-db.token.ts for the full
 * explanation of why this pattern exists.
 */
export interface AuditEntry {
  tenantId?: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  context?: Record<string, unknown>;
}
