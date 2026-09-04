const express = require('express');
const controller = require('./orders.controller');
const validate = require('../../middleware/validate');
const { getOrderParams, getOrderQuery } = require('./orders.schema');
const { orderLookupLimiter, repLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

// Rate limit chosen per-request based on who's asking: an authenticated rep
// gets the looser limit, an anonymous customer gets the tight one. Applied
// before validation so abuse gets rejected before we even parse input.
function scopedLimiter(req, res, next) {
  return (req.actor?.type === 'REP' ? repLimiter : orderLookupLimiter)(req, res, next);
}

router.get(
  '/:orderId',
  scopedLimiter,
  validate({ params: getOrderParams, query: getOrderQuery }),
  controller.getOrder
);

module.exports = router;
