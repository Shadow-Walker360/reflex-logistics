const service = require('./reports.service');

async function createReport(req, res, next) {
  try {
    const { orderId } = req.params;
    const { message, email } = req.body;

    const created = await service.fileReport({
      externalOrderId: orderId,
      actor: req.actor,
      email,
      message,
    });

    res.status(201).json({
      data: { id: created.id, createdAt: created.createdAt },
      requestId: req.id,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createReport };
