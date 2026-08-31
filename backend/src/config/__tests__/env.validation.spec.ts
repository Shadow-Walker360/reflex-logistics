import { envValidationSchema } from '../env.validation';

/**
 * Spec-adjacent principle (Section 46, Secrets Management / Section 6,
 * Authentication): the app should fail loudly at boot on missing/malformed
 * configuration rather than starting in a half-broken state.
 */
describe('envValidationSchema', () => {
  const validEnv = {
    NODE_ENV: 'development',
    PORT: '3000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    REDIS_URL: 'redis://localhost:6379',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  it('accepts a fully valid environment', () => {
    const { error } = envValidationSchema.validate(validEnv);
    expect(error).toBeUndefined();
  });

  it('rejects a missing DATABASE_URL', () => {
    const { DATABASE_URL, ...rest } = validEnv;
    const { error } = envValidationSchema.validate(rest);
    expect(error).toBeDefined();
    expect(error?.message).toContain('DATABASE_URL');
  });

  it('rejects a missing REDIS_URL', () => {
    const { REDIS_URL, ...rest } = validEnv;
    const { error } = envValidationSchema.validate(rest);
    expect(error).toBeDefined();
    expect(error?.message).toContain('REDIS_URL');
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      JWT_ACCESS_SECRET: 'too-short',
    });
    expect(error).toBeDefined();
    expect(error?.message).toContain('JWT_ACCESS_SECRET');
  });

  it('rejects an invalid NODE_ENV value', () => {
    const { error } = envValidationSchema.validate({
      ...validEnv,
      NODE_ENV: 'production-ish',
    });
    expect(error).toBeDefined();
  });

  it('defaults PORT to 3000 when omitted', () => {
    const { PORT, ...rest } = validEnv;
    const { value, error } = envValidationSchema.validate(rest);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
  });

  it('defaults LOG_LEVEL to info when omitted', () => {
    const { value, error } = envValidationSchema.validate(validEnv);
    expect(error).toBeUndefined();
    expect(value.LOG_LEVEL).toBe('info');
  });

  describe('security fixes (post-Phase-2 audit)', () => {
    it('rejects JWT_REFRESH_SECRET being identical to JWT_ACCESS_SECRET', () => {
      const sameSecret = 'x'.repeat(32);
      const { error } = envValidationSchema.validate({
        ...validEnv,
        JWT_ACCESS_SECRET: sameSecret,
        JWT_REFRESH_SECRET: sameSecret,
      });
      expect(error).toBeDefined();
      expect(error?.message).toContain('JWT_REFRESH_SECRET');
    });

    it('accepts distinct access and refresh secrets (baseline, still works)', () => {
      const { error } = envValidationSchema.validate(validEnv);
      expect(error).toBeUndefined();
    });

    it('defaults TRUST_PROXY to false when omitted (safe default)', () => {
      const { value, error } = envValidationSchema.validate(validEnv);
      expect(error).toBeUndefined();
      expect(value.TRUST_PROXY).toBe(false);
    });

    it('accepts TRUST_PROXY explicitly set to true', () => {
      const { value, error } = envValidationSchema.validate({
        ...validEnv,
        TRUST_PROXY: 'true',
      });
      expect(error).toBeUndefined();
      expect(value.TRUST_PROXY).toBe(true);
    });
  });
});
