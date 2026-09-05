const { z } = require('zod');
const { orderIdParam } = require('../orders/orders.schema');

const createReportParams = z.object({
  orderId: orderIdParam,
});

const createReportBody = z.object({
  message: z
    .string()
    .trim()
    .min(10, 'Please provide a bit more detail (at least 10 characters).')
    .max(2000, 'Message is too long (2000 characters max).'),
  email: z.string().email().optional(), // required for CUSTOMER actor, checked in service
});

module.exports = { createReportParams, createReportBody };
