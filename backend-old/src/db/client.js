const { PrismaClient } = require('@prisma/client');
const config = require('../config');

// Prevents "too many Prisma clients" during `node --watch` dev reloads by
// stashing the instance on `global`. In a real serverless deploy (Lambda/etc)
// this same pattern also matters — one client per warm container, not per invocation.
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: config.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (config.NODE_ENV !== 'production') {
  globalForPrisma.__prisma = prisma;
}

module.exports = prisma;
