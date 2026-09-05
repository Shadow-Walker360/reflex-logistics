/**
 * Structured configuration factory consumed by @nestjs/config.
 *
 * Nothing in the rest of the application should call `process.env` directly.
 * Everything goes through ConfigService so that (a) the shape is typed and
 * documented in one place, and (b) env.validation.ts has already guaranteed
 * these values exist and are well-formed by the time anything reads them.
 */
export default () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  trustProxy: process.env.TRUST_PROXY === 'true',

  database: {
    url: process.env.DATABASE_URL,
  },

  redis: {
    url: process.env.REDIS_URL,
  },

  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },

  // ADR-012: self-service signup requires explicit terms acceptance.
  // CURRENT_TERMS_VERSION is a plain string identifier (e.g. a date or
  // semantic version) bumped whenever the terms text materially changes -
  // stored alongside each user's acceptance so "which version did they
  // agree to" is always answerable. TERMS_URL is where the frontend links
  // to the actual document; the backend does not host or render legal
  // content itself (see GET /legal/terms).
  legal: {
    currentTermsVersion: process.env.CURRENT_TERMS_VERSION || '2026-08-29',
    termsUrl: process.env.TERMS_URL || 'https://reflex-logistics.example/terms',
  },
});
