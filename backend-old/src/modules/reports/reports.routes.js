const express = require('express');
const controller = require('./reports.controller');
const validate = require('../../middleware/validate');
const { createReportParams, createReportBody } = require('./reports.schema');
const { orderLookupLimiter, repLimiter } = require('../../middleware/rateLimiter');

const router = express.Router();

function scopedLimiter(req, res, next) {
  return (req.actor?.type === 'REP' ? repLimiter : orderLookupLimiter)(req, res, next);
}

router.post(
  '/:orderId',
  scopedLimiter,
  validate({ params: createReportParams, body: createReportBody }),
  controller.createReport
);

module.exports = router;
