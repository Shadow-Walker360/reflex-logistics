import * as Joi from 'joi';

/**
 * Environment validation schema.
 *
 * The application refuses to start if required environment variables are
 * missing or malformed. This is deliberate: a backend that silently starts
 * with an undefined DATABASE_URL or JWT secret is a backend that fails in
 * confusing ways later instead of failing loudly at boot.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),

  PORT: Joi.number().port().default(3000),

  API_PREFIX: Joi.string().default('api/v1'),

  // Database
  DATABASE_URL: Joi.string().uri().required(),

  // Redis
  REDIS_URL: Joi.string().uri().required(),

  // Auth
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    // Security fix (post-Phase-2 audit): ADR-008 states the access and
    // refresh secrets "must be distinct" but nothing previously enforced
    // it. JwtStrategy.validate() already rejects a refresh-typed payload
    // presented as an access token even if the secrets happened to match
    // (defense in depth), but relying on that single check alone is a
    // single point of failure - this makes the distinctness a hard boot-
    // time requirement instead, matching what the ADR already claimed.
    .invalid(Joi.ref('JWT_ACCESS_SECRET'))
    .messages({
      'any.invalid':
        'JWT_REFRESH_SECRET must be different from JWT_ACCESS_SECRET.',
    }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Security fix (post-Phase-2 audit): governs whether Express/the app
  // trusts X-Forwarded-For for computing the real client IP (used by
  // RateLimitGuard and audit logging). Defaults to false - the safe
  // default for local dev and any deployment exposing the Node process
  // directly, where a client could otherwise spoof this header to obtain
  // a fresh rate-limit bucket per request. Set to true only when actually
  // deployed behind a trusted reverse proxy/load balancer that overwrites
  // (not appends to) this header - spec Section 47 topology.
  TRUST_PROXY: Joi.boolean().default(false),

  // CORS
  CORS_ORIGIN: Joi.string().default('*'),

  // Logging
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),

  // Legal / signup (ADR-012)
  CURRENT_TERMS_VERSION: Joi.string().default('2026-08-29'),
  TERMS_URL: Joi.string()
    .uri()
    .default('https://reflex-logistics.example/terms'),
});
