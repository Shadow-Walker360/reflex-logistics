const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ns10492 = await prisma.order.upsert({
    where: { externalOrderId: 'NS-10492' },
    update: {},
    create: {
      externalOrderId: 'NS-10492',
      customerEmail: 'user@example.com',
      status: 'SHIPPED',
      carrier: 'FedEx',
      trackingNumber: '48000250030662',
      placedAt: new Date('2026-08-08T00:00:00Z'),
      eta: new Date('2026-08-14T00:00:00Z'),
      items: {
        create: [
          { sku: 'HOODIE-NAVY-M', name: 'Northstar Classic Hoodie (M / Navy)', status: 'DELIVERED' },
          { sku: 'SHOE-TRAIL-BLK-10', name: 'Trail Running Shoes (10 / Black)', status: 'SHIPPED' },
        ],
      },
      trackingEvents: {
        create: [
          { title: 'Label created', location: 'Northstar Fulfillment — Louisville, KY', latitude: 38.2527, longitude: -85.7585, occurredAt: new Date('2026-08-10T09:02:00Z'), state: 'DONE', sequence: 1 },
          { title: 'Picked up by carrier', location: 'Louisville, KY', latitude: 38.2, longitude: -85.65, occurredAt: new Date('2026-08-10T16:41:00Z'), state: 'DONE', sequence: 2 },
          { title: 'Arrived at sort facility', location: 'Regional Hub — Indianapolis, IN', latitude: 39.7684, longitude: -86.1581, occurredAt: new Date('2026-08-11T02:15:00Z'), state: 'DONE', sequence: 3 },
          { title: 'Arrived at local facility', location: 'Local Hub — Columbus, OH', latitude: 39.9612, longitude: -82.9988, occurredAt: new Date('2026-08-12T05:47:00Z'), state: 'CURRENT', sequence: 4 },
          { title: 'Delivered', location: 'Destination address', latitude: 40.015, longitude: -83.03, occurredAt: new Date('2026-08-14T00:00:00Z'), state: 'PENDING', sequence: 5 },
        ],
      },
    },
  });

  await prisma.order.upsert({
    where: { externalOrderId: 'NS-20871' },
    update: {},
    create: {
      externalOrderId: 'NS-20871',
      customerEmail: 'jordan@example.com',
      status: 'DELIVERED',
      carrier: 'UPS',
      trackingNumber: '1Z999AA10123456784',
      placedAt: new Date('2026-08-02T00:00:00Z'),
      eta: new Date('2026-08-06T00:00:00Z'),
      items: { create: [{ sku: 'BOTTLE-SLATE-32', name: 'Insulated Water Bottle (32oz / Slate)', status: 'DELIVERED' }] },
      trackingEvents: {
        create: [
          { title: 'Label created', location: 'Northstar Fulfillment — Reno, NV', latitude: 39.5296, longitude: -119.8138, occurredAt: new Date('2026-08-03T08:00:00Z'), state: 'DONE', sequence: 1 },
          { title: 'Out for delivery', location: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194, occurredAt: new Date('2026-08-06T08:12:00Z'), state: 'DONE', sequence: 2 },
          { title: 'Delivered', location: 'Destination address', latitude: 37.7849, longitude: -122.4294, occurredAt: new Date('2026-08-06T13:14:00Z'), state: 'DONE', sequence: 3 },
        ],
      },
      returns: {
        create: {
          status: 'REFUND_PENDING',
          reason: 'wrong_size',
          refundAmountCents: 2400,
          initiatedAt: new Date('2026-08-09T00:00:00Z'),
          estimatedRefundAt: new Date('2026-08-16T00:00:00Z'),
        },
      },
    },
  });

  console.log('Seeded orders NS-10492 and NS-20871');
  void ns10492;
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
