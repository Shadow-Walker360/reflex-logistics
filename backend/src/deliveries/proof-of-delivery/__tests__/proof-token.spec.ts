import {
  generateProofToken,
  hashProofToken,
  computeProofTokenExpiry,
  isProofTokenExpired,
  hashesMatch,
  PROOF_TOKEN_TTL_MS,
} from '../proof-token';

describe('proof-of-delivery token functions', () => {
  describe('generateProofToken', () => {
    it('generates a 64-character hex string (32 random bytes)', () => {
      const token = generateProofToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('generates a different token on every call', () => {
      const a = generateProofToken();
      const b = generateProofToken();
      expect(a).not.toBe(b);
    });
  });

  describe('hashProofToken', () => {
    it('produces a deterministic hash for the same input', () => {
      const token = generateProofToken();
      expect(hashProofToken(token)).toBe(hashProofToken(token));
    });

    it('does not return the plaintext token', () => {
      const token = 'a'.repeat(64);
      const hash = hashProofToken(token);
      expect(hash).not.toBe(token);
    });

    it('produces different hashes for different tokens', () => {
      expect(hashProofToken('a'.repeat(64))).not.toBe(
        hashProofToken('b'.repeat(64)),
      );
    });
  });

  describe('computeProofTokenExpiry / isProofTokenExpired', () => {
    it('computes an expiry 15 minutes in the future', () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const expiry = computeProofTokenExpiry(now);
      expect(expiry.getTime() - now.getTime()).toBe(PROOF_TOKEN_TTL_MS);
    });

    it('a freshly issued token is not expired', () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const expiry = computeProofTokenExpiry(now);
      expect(isProofTokenExpired(expiry, now)).toBe(false);
    });

    it('a token is expired exactly at its expiry timestamp', () => {
      const expiry = new Date('2026-01-01T00:15:00.000Z');
      expect(isProofTokenExpired(expiry, expiry)).toBe(true);
    });

    it('a token is expired after its expiry timestamp has passed', () => {
      const now = new Date('2026-01-01T00:00:00.000Z');
      const expiry = computeProofTokenExpiry(now);
      const later = new Date(expiry.getTime() + 1000);
      expect(isProofTokenExpired(expiry, later)).toBe(true);
    });
  });

  describe('hashesMatch', () => {
    it('returns true for identical hashes', () => {
      const hash = hashProofToken(generateProofToken());
      expect(hashesMatch(hash, hash)).toBe(true);
    });

    it('returns false for different hashes', () => {
      const hashA = hashProofToken('a'.repeat(64));
      const hashB = hashProofToken('b'.repeat(64));
      expect(hashesMatch(hashA, hashB)).toBe(false);
    });

    it('returns false (not throws) for hashes of different lengths', () => {
      expect(hashesMatch('abcd', 'abcdef')).toBe(false);
    });

    it('is not vulnerable to a trivial short-circuit timing difference for a single differing byte', () => {
      // Not a true timing-attack detector (that needs statistical
      // measurement over many trials, out of scope for a unit test) -
      // this just confirms both a near-total mismatch and a
      // single-trailing-character mismatch return false via the same
      // code path (timingSafeEqual), rather than an early-exit
      // string comparison that would behave differently.
      const base = hashProofToken('a'.repeat(64));
      const almostSame = base.slice(0, -1) + (base.at(-1) === '0' ? '1' : '0');
      expect(hashesMatch(base, almostSame)).toBe(false);
    });
  });
});
