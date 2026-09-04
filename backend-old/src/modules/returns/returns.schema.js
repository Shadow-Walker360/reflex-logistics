const { z } = require('zod');
const { orderIdParam } = require('../orders/orders.schema');

const REASON_CODES = ['wrong_size', 'wrong_item', 'damaged', 'no_longer_needed', 'quality_issue', 'other'];

const initiateReturnParams = z.object({
  orderId: orderIdParam,
});

const initiateReturnBody = z.object({
  reason: z.enum(REASON_CODES, { errorMap: () => ({ message: `reason must be one of: ${REASON_CODES.join(', ')}` }) }),
  email: z.string().email().optional(), // required for CUSTOMER actor, checked in service
});

module.exports = { initiateReturnParams, initiateReturnBody, REASON_CODES };
