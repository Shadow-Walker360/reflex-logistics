/**
 * Spec reference: Section 40 (Auditing) - "Do not log sensitive secrets."
 *
 * Pulled out as a standalone pure function (rather than a private method on
 * AuditService) so it can be unit-tested without constructing AuditService
 * itself, which requires PrismaService and is therefore affected by the
 * Prisma-client-generation blocker documented in docs/database.md - this
 * function has no such dependency.
 */
const DENYLISTED_KEYS = new Set([
  'password',
  'passwordHash',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
]);

export function scrubAuditContext(
  context: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    result[key] = DENYLISTED_KEYS.has(key) ? '[REDACTED]' : value;
  }
  return result;
}
