const service = require('./returns.service');

async function initiateReturn(req, res, next) {
  try {
    const { orderId } = req.params;
    const { reason, email } = req.body;

    const created = await service.initiateReturn({
      externalOrderId: orderId,
      actor: req.actor,
      email,
      reason,
      requestId: req.id,
      ipAddress: req.ip,
    });

    res.status(201).json({
      data: {
        status: created.status,
        reason: created.reason,
        initiatedAt: created.initiatedAt,
        estimatedRefundAt: created.estimatedRefundAt,
      },
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { initiateReturn };
