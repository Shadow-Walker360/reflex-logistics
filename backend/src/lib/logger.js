const pino = require('pino');
const config = require('../config');

// Pretty-print in dev so it's readable in a terminal; raw structured JSON everywhere
// else so it's actually queryable once it hits a real log aggregator.
const logger = pino({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    config.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } }
      : undefined,
});

module.exports = logger;
