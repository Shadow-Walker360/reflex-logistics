const reportsRepo = require('./reports.repository');
const ordersRepo = require('../orders/orders.repository');
const AppError = require('../../lib/AppError');

async function fileReport({ externalOrderId, actor, email, message }) {
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

  return reportsRepo.createReport({
    orderId: order.id,
    actorType: actor.type,
    repEmail: actor.type === 'REP' ? actor.repEmail : null,
    email: actor.type === 'CUSTOMER' ? email : email || null,
    message,
  });
}

module.exports = { fileReport };
