/**
 * Why this file exists: DispatchService.assign() is covered by a
 * concurrency test that is important enough to actually run in this
 * sandbox, not just exist as blocked-pending-Prisma-generation code like
 * most other Prisma-touching services in this project (see
 * docs/database.md). Importing the concrete `PrismaService` class type
 * directly poisons the importing file with the same "PrismaClient has no
 * exported member" error even for files that only need a handful of its
 * methods and never actually construct a real PrismaClient - because
 * PrismaService's own declaration (`class PrismaService extends
 * PrismaClient`) is what's broken, and TypeScript must resolve that base
 * class to know PrismaService's shape, even via `import type`.
 *
 * DispatchService therefore depends on a narrow structural interface
 * (DispatchDatabaseClient, in dispatch.service.ts) describing only the
 * handful of Prisma methods it actually calls, injected via this token
 * rather than by referencing the PrismaService class type directly.
 * dispatch.module.ts (a wiring file, never imported by a unit test) binds
 * this token to the real PrismaService instance with `useExisting`.
 *
 * This is a genuine dependency-inversion improvement, not merely a
 * workaround - it was scoped to DispatchService only, rather than applied
 * project-wide, because doing this for every Prisma-touching service
 * would be a much larger refactor than this session's stated goal.
 */
export const DISPATCH_DB = Symbol('DISPATCH_DB');

/**
 * Same rationale as DISPATCH_DB above, applied to DispatchService's other
 * two dependencies: AuditService and VehiclesService both themselves
 * depend on PrismaService, so importing either of THEIR class types would
 * re-introduce the exact problem this file exists to avoid. Both are
 * narrowed to the minimal interface DispatchService actually calls.
 */
export const DISPATCH_AUDIT = Symbol('DISPATCH_AUDIT');
export const DISPATCH_VEHICLES = Symbol('DISPATCH_VEHICLES');
