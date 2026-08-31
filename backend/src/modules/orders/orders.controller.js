const service = require('./orders.service');

/**
 * Maps an Order (+ relations) DB row to the exact shape the frontend
 * renders. Keeping this mapping here, not in the repository, means the DB
 * schema is free to change shape without the API contract changing.
 */
function toOrderResponse(order) {
  return {
    orderId: order.externalOrderId,
    placedOn: order.placedAt,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    eta: order.eta,
    status: order.status,
    items: order.items.map((i) => ({ name: i.name, sku: i.sku, status: i.status })),
    returns:
      order.returns?.length > 0
        ? {
            status: order.returns[0].status,
            reason: order.returns[0].reason,
            refundAmountCents: order.returns[0].refundAmountCents,
            initiatedAt: order.returns[0].initiatedAt,
            estimatedRefundAt: order.returns[0].estimatedRefundAt,
          }
        : null,
    trackingEvents: order.trackingEvents.map((ev) => ({
      title: ev.title,
      location: ev.location,
      latitude: ev.latitude,
      longitude: ev.longitude,
      occurredAt: ev.occurredAt,
      state: ev.state,
    })),
  };
}

async function getOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { email } = req.query;

    const order = await service.getOrderForActor({
      externalOrderId: orderId,
      actor: req.actor,
      email,
      requestId: req.id,
      ipAddress: req.ip,
    });

    res.json({ data: toOrderResponse(order), requestId: req.id });
  } catch (err) {
    next(err);
  }
}

module.exports = { getOrder, toOrderResponse };
