const { v4: uuidv4 } = require('uuid');

/**
 * Every request gets a UUID, exposed on req.id, echoed back as X-Request-Id,
 * and threaded into every log line and audit log row from here on. This is
 * what lets you take a request ID a customer/rep reports and grep it across
 * app logs, carrier-client logs, and the audit table.
 */
function requestId(req, res, next) {
  const incoming = req.headers['x-request-id'];
  req.id = typeof incoming === 'string' && incoming.length > 0 ? incoming : uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = requestId;
