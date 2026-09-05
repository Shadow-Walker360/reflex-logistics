const rateLimit = require('express-rate-limit');
const AppError = require('../lib/AppError');

function makeLimiter({ windowMs, max }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
      next(AppError.rateLimited('Too many requests, please try again shortly.'));
    },
  });
}

// Customer order lookup is unauthenticated and directly guessable (order IDs
// are short + sequential-ish) — this is the endpoint someone would script
// against to enumerate orders/emails. Keep it tight.
const orderLookupLimiter = makeLimiter({ windowMs: 60 * 1000, max: 10 });

// Rep-authenticated traffic is trusted further; loosen it.
const repLimiter = makeLimiter({ windowMs: 60 * 1000, max: 60 });

module.exports = { orderLookupLimiter, repLimiter };
