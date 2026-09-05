const AppError = require('../lib/AppError');
const { verifyRepToken } = require('../lib/repToken');

/**
 * Identifies the caller and attaches req.actor = { type: 'CUSTOMER' | 'REP', repEmail?: string }.
 *
 * Rep sessions are HMAC-signed, expiring tokens (see lib/repToken.js) — not
 * real SSO yet, but no longer a format-only stub either (see AUDIT_REPORT.md
 * C-1: the previous version accepted any string shaped like `rep:<email>`
 * with zero verification). Swap in real JWT/SSO verification later; nothing
 * downstream of req.actor needs to change.
 */
function identifyActor(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    req.actor = { type: 'CUSTOMER' };
    return next();
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const repEmail = verifyRepToken(token);

  if (!repEmail) {
    return next(AppError.unauthorized('Invalid or expired rep session', 'INVALID_SESSION'));
  }

  req.actor = { type: 'REP', repEmail };
  next();
}

/**
 * Requires the caller to be an authenticated rep. Use on routes that should
 * never be reachable by an unauthenticated customer (e.g. cross-customer
 * order search, if that's ever added).
 */
function requireRep(req, res, next) {
  if (req.actor?.type !== 'REP') {
    return next(AppError.unauthorized('This action requires a rep session', 'REP_REQUIRED'));
  }
  next();
}

module.exports = { identifyActor, requireRep };
