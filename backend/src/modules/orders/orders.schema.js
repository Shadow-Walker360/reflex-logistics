const { z } = require('zod');

const orderIdParam = z
  .string()
  .regex(/^[A-Z]{2,4}-\d{4,8}$/, 'Invalid order ID format (expected e.g. NS-10492)');

const getOrderParams = z.object({
  orderId: orderIdParam,
});

// email is required when the caller is a customer (checked in the controller,
// since "required" here depends on req.actor which zod alone can't see).
// Reps may omit it and look up by order ID alone.
const getOrderQuery = z.object({
  email: z.string().email('Invalid email format').optional(),
});

module.exports = { orderIdParam, getOrderParams, getOrderQuery };
