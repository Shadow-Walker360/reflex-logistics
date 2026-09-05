const config = require('./config'); // importing first triggers fail-fast env validation
const app = require('./app');
const logger = require('./lib/logger');
const db = require('./db/client');

const server = app.listen(config.PORT, () => {
  logger.info(`Northstar support API listening on port ${config.PORT} (${config.NODE_ENV})`);
});

async function shutdown(signal) {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async () => {
    await db.$disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
  });
  // Force-exit if graceful shutdown hangs
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (err) => {
  // A synchronous throw outside any request context has no natural place to
  // be caught. Log it with full context, then exit deliberately rather than
  // let the process limp on in a state Node no longer guarantees is safe —
  // container orchestration (or `npm run dev`) is expected to restart it.
  logger.fatal({ err }, 'Uncaught exception — shutting down');
  process.exit(1);
});
