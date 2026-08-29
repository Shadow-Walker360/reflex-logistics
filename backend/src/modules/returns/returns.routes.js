const express = require('express');
const controller = require('./returns.controller');
const validate = require('../../middleware/validate');
const { initiateReturnParams, initiateReturnBody } = require('./returns.schema');
const { orderLookupLimiter, repLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

function scopedLimiter(req, res, next) {
  return (req.actor?.type === 'REP' ? repLimiter : orderLookupLimiter)(req, res, next);
}

router.post(
  '/:orderId',
  scopedLimiter,
  validate({ params: initiateReturnParams, body: initiateReturnBody }),
  controller.initiateReturn
);

module.exports = router;
