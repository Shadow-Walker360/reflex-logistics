const config = require('../config');
const AppError = require('./AppError');
const logger = require('./logger');

/**
 * Stands in for Northstar's real order-of-record system / carrier API.
 * This is the ONE function you swap for a real fetch() call — nothing in
 * orders.service.js or above needs to change when you do.
 *
 * Wire the real version to `${config.CARRIER_API_BASE_URL}/orders/:id`
 * with `Authorization: Bearer ${config.CARRIER_API_KEY}`.
 */
async function fetchOrder(externalOrderId) {
  logger.debug({ externalOrderId }, 'fetchOrder: stub carrier client called');

  const mock = MOCK_UPSTREAM[externalOrderId];
  if (!mock) {
    throw AppError.notFound(`No order found for ${externalOrderId}`, 'ORDER_NOT_FOUND');
  }

  // Simulate upstream latency so the read-through cache behavior is honest in dev.
  await new Promise((resolve) => setTimeout(resolve, 120));

  return mock;
}

const MOCK_UPSTREAM = {
  'NS-10492': {
    customerEmail: 'user@example.com',
    status: 'SHIPPED',
    carrier: 'FedEx',
    trackingNumber: '48000250030662',
    placedAt: new Date('2026-08-08T00:00:00Z'),
    eta: new Date('2026-08-14T00:00:00Z'),
    items: [
      { sku: 'HOODIE-NAVY-M', name: 'Northstar Classic Hoodie (M / Navy)', status: 'DELIVERED' },
      { sku: 'SHOE-TRAIL-BLK-10', name: 'Trail Running Shoes (10 / Black)', status: 'SHIPPED' },
    ],
    trackingEvents: [
      { title: 'Label created', location: 'Northstar Fulfillment — Louisville, KY', latitude: 38.2527, longitude: -85.7585, occurredAt: new Date('2026-08-10T09:02:00Z'), state: 'DONE', sequence: 1 },
      { title: 'Picked up by carrier', location: 'Louisville, KY', latitude: 38.2, longitude: -85.65, occurredAt: new Date('2026-08-10T16:41:00Z'), state: 'DONE', sequence: 2 },
      { title: 'Arrived at sort facility', location: 'Regional Hub — Indianapolis, IN', latitude: 39.7684, longitude: -86.1581, occurredAt: new Date('2026-08-11T02:15:00Z'), state: 'DONE', sequence: 3 },
      { title: 'Arrived at local facility', location: 'Local Hub — Columbus, OH', latitude: 39.9612, longitude: -82.9988, occurredAt: new Date('2026-08-12T05:47:00Z'), state: 'CURRENT', sequence: 4 },
      { title: 'Delivered', location: 'Destination address', latitude: 40.015, longitude: -83.03, occurredAt: new Date('2026-08-14T00:00:00Z'), state: 'PENDING', sequence: 5 },
    ],
  },
  'NS-20871': {
    customerEmail: 'jordan@example.com',
    status: 'DELIVERED',
    carrier: 'UPS',
    trackingNumber: '1Z999AA10123456784',
    placedAt: new Date('2026-08-02T00:00:00Z'),
    eta: new Date('2026-08-06T00:00:00Z'),
    items: [{ sku: 'BOTTLE-SLATE-32', name: 'Insulated Water Bottle (32oz / Slate)', status: 'DELIVERED' }],
    trackingEvents: [
      { title: 'Label created', location: 'Northstar Fulfillment — Reno, NV', latitude: 39.5296, longitude: -119.8138, occurredAt: new Date('2026-08-03T08:00:00Z'), state: 'DONE', sequence: 1 },
      { title: 'Out for delivery', location: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194, occurredAt: new Date('2026-08-06T08:12:00Z'), state: 'DONE', sequence: 2 },
      { title: 'Delivered', location: 'Destination address', latitude: 37.7849, longitude: -122.4294, occurredAt: new Date('2026-08-06T13:14:00Z'), state: 'DONE', sequence: 3 },
    ],
  },
};

module.exports = { fetchOrder };
