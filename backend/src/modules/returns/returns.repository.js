const db = require('../../db/client');

async function findExistingReturn(orderId) {
  return db.return.findFirst({ where: { orderId }, orderBy: { initiatedAt: 'desc' } });
}

async function createReturn({ orderId, reason }) {
  return db.return.create({
    data: { orderId, reason, status: 'REQUESTED' },
  });
}

async function logReturnInitiated({ orderId, actorType, repEmail, requestId, ipAddress }) {
  return db.lookupAuditLog.create({
    data: { orderId, actorType, repEmail, action: 'RETURN_INITIATED', requestId, ipAddress },
  });
}

module.exports = { findExistingReturn, createReturn, logReturnInitiated };
