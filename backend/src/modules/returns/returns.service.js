const returnsRepo = require('./returns.repository');
const ordersRepo = require('../orders/orders.repository');
const AppError = require('../../lib/AppError');

async function initiateReturn({ externalOrderId, actor, email, reason, requestId, ipAddress }) {
  const order = await ordersRepo.findByExternalId(externalOrderId);
  if (!order) {
    throw AppError.notFound(`No order found matching "${externalOrderId}"`, 'ORDER_NOT_FOUND');
  }

  if (actor.type === 'CUSTOMER') {
    if (!email) throw AppError.badRequest('Email is required', 'EMAIL_REQUIRED');
    if (order.customerEmail.toLowerCase() !== email.toLowerCase()) {
      throw AppError.forbidden("This order's email doesn't match our records", 'EMAIL_MISMATCH');
    }
  }

  const existing = await returnsRepo.findExistingReturn(order.id);
  if (existing) {
    // Idempotent-ish: don't create a duplicate return, just tell the caller
    // what's already in flight. Real duplicate-submission protection would
    // also want a unique constraint or explicit status check here.
    throw AppError.badRequest('A return has already been initiated for this order', 'RETURN_ALREADY_EXISTS', {
      existingStatus: existing.status,
    });
  }

  const created = await returnsRepo.createReturn({ orderId: order.id, reason });

  await returnsRepo.logReturnInitiated({
    orderId: order.id,
    actorType: actor.type,
    repEmail: actor.type === 'REP' ? actor.repEmail : null,
    requestId,
    ipAddress,
  });

  return created;
}

module.exports = { initiateReturn };
