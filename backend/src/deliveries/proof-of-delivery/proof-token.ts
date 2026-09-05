import { randomBytes, createHash, timingSafeEqual } from 'crypto';

/**
 * Spec reference: Section 26 (Proof of Delivery) - "single-use
 * confirmation token" variant (the alternative to an embedded-claims
 * signed JWT, both mentioned in the spec as valid designs). Chosen for
 * consistency with the existing pattern already established for
 * RefreshToken (Phase 2): generate a high-entropy opaque token, store
 * only its hash, never the raw value - a database read alone cannot
 * reproduce a usable token.
 *
 * Pulled into a standalone pure-function file (no Prisma/NestJS
 * dependency) so it's independently unit-testable - the same pattern
 * used for scrubAuditContext and isVehicleEligible elsewhere in this
 * codebase.
 */

export const PROOF_TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes, spec Section 26 example

export function generateProofToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashProofToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function computeProofTokenExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + PROOF_TOKEN_TTL_MS);
}

export function isProofTokenExpired(
  expiresAt: Date,
  now: Date = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

/**
 * Constant-time comparison of two hex-encoded hash strings. Spec Section
 * 26 threat list explicitly includes replay attacks; a non-constant-time
 * string comparison (`a === b`) leaks timing information about how many
 * leading characters matched, which is a meaningfully different (and
 * strictly worse) property than the DB-index-lookup-based comparison used
 * for RefreshToken (Section 6) - here the token is presented directly by
 * the caller in a single request rather than looked up by unique index,
 * so a timing side-channel on the comparison itself is a real attack
 * surface worth closing directly.
 */
export function hashesMatch(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'hex');
  const bufferB = Buffer.from(b, 'hex');
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
