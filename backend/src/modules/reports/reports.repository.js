const db = require('../../db/client');

async function createReport({ orderId, actorType, repEmail, email, message }) {
  return db.supportReport.create({
    data: { orderId, actorType, repEmail, email, message },
  });
}

module.exports = { createReport };
