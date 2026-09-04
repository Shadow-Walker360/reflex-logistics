const AppError = require('../lib/AppError');
const logger = require('../lib/logger');

/**
 * Single place where every error in the app becomes an HTTP response.
 * Contract the frontend can rely on:
 *   { error: { code: string, message: string, requestId: string, details?: any } }
 *
 * AppErrors are "expected" — logged at warn, safe to show message to the user.
 * Everything else is a bug — logged at error with full stack, and the client
 * gets a generic message so internals never leak.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const requestId = req.id;

  if (err instanceof AppError) {
    logger.warn({ requestId, code: err.code, statusCode: err.statusCode, details: err.details }, err.message);
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        requestId,
        ...(err.details ? { details: err.details } : {}),
      },
    });
  }

  // Unexpected error — never leak stack traces or internal messages to the client.
  logger.error({ requestId, err }, 'Unhandled error');
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our end. If this persists, share this request ID with support.',
      requestId,
    },
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `No route matches ${req.method} ${req.originalUrl}`,
      requestId: req.id,
    },
  });
}

module.exports = { errorHandler, notFoundHandler };
