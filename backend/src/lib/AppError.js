/**
 * Typed error for anything the app raises on purpose (validation failure,
 * not-found, forbidden, upstream carrier failure, etc). Anything that ISN'T
 * an AppError reaching the error handler is treated as a genuine bug and
 * logged/reported differently (see middleware/errorHandler.js).
 *
 * `code` is a stable machine-readable string the frontend can switch on
 * without parsing message text (message text is allowed to change; code is not).
 */
class AppError extends Error {
  constructor(message, { statusCode = 500, code = 'INTERNAL_ERROR', details = undefined } = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // distinguishes "expected" errors from crashes
    Error.captureStackTrace(this, this.constructor);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND', details) {
    return new AppError(message, { statusCode: 404, code, details });
  }

  static forbidden(message = 'Not authorized to access this resource', code = 'FORBIDDEN', details) {
    return new AppError(message, { statusCode: 403, code, details });
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED', details) {
    return new AppError(message, { statusCode: 401, code, details });
  }

  static badRequest(message = 'Invalid request', code = 'BAD_REQUEST', details) {
    return new AppError(message, { statusCode: 400, code, details });
  }

  static upstream(message = 'Upstream service failure', code = 'UPSTREAM_ERROR', details) {
    return new AppError(message, { statusCode: 502, code, details });
  }

  static rateLimited(message = 'Too many requests', code = 'RATE_LIMITED', details) {
    return new AppError(message, { statusCode: 429, code, details });
  }
}

module.exports = AppError;
