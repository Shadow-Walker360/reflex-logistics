import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/auth/password.service';

/**
 * E2E: the full delivery critical path (spec Section 44 critical
 * scenarios 1-7, plus the build directive's own "critical path" request).
 *
 * NOTE (honesty flag, same as every other e2e spec in this project): this
 * suite requires a real PostgreSQL connection and a generated Prisma
 * client. It has NOT been executed in the build sandbox used to author
 * this code - see docs/progress.md "Blocked". Written now, ready to run
 * once `npx prisma generate && npx prisma migrate dev` succeed somewhere
 * with real network access.
 *
 * Covers: create -> assign (incl. the concurrency race) -> accept ->
 * pick up -> in transit -> proof-of-delivery request/confirm -> delivered,
 * plus tenant isolation (scenario 1), row-scoped rider access (scenario 2),
 * the assignment race (scenario 3), idempotent delivery creation
 * (scenario 5), invalid-transition rejection (scenario 6), and delivery
 * history preservation (scenario 7).
 */
describe('Deliveries critical path (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwords: PasswordService;

  const tenantSlugA = 'critical-path-tenant-a';
  const tenantSlugB = 'critical-path-tenant-b';
  const plainPassword = 'correct-horse-battery-staple';

  let tenantAId: string;
  let tenantBId: string;

  let retailerToken: string;
  let dispatcherToken: string;
  let riderAToken: string;
  let riderBToken: string;
  let riderAId: string;
  let riderBId: string;
  let managerAdminToken: string;

  let customerId: string;
  let vehicleId: string;

  async function login(tenantSlug: string, email: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ tenantSlug, email, password: plainPassword })
      .expect(200);
    return res.body.accessToken;
  }

  function authed(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    passwords = app.get(PasswordService);
    const passwordHash = await passwords.hash(plainPassword);

    const tenantA = await prisma.tenant.create({
      data: { name: 'Critical Path A', slug: tenantSlugA },
    });
    tenantAId = tenantA.id;
    const tenantB = await prisma.tenant.create({
      data: { name: 'Critical Path B', slug: tenantSlugB },
    });
    tenantBId = tenantB.id;

    await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: 'retailer@a.example',
        passwordHash,
        role: 'RETAILER',
      },
    });
    await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: 'dispatcher@a.example',
        passwordHash,
        role: 'DISPATCHER',
      },
    });
    await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: 'manager@a.example',
        passwordHash,
        role: 'MANAGER_ADMIN',
      },
    });

    const riderAUser = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: 'rider-a@a.example',
        passwordHash,
        role: 'RIDER',
      },
    });
    const riderARow = await prisma.rider.create({
      data: { tenantId: tenantAId, userId: riderAUser.id, isAvailable: true },
    });
    riderAId = riderARow.id;

    const riderBUser = await prisma.user.create({
      data: {
        tenantId: tenantAId,
        email: 'rider-b@a.example',
        passwordHash,
        role: 'RIDER',
      },
    });
    const riderBRow = await prisma.rider.create({
      data: { tenantId: tenantAId, userId: riderBUser.id, isAvailable: true },
    });
    riderBId = riderBRow.id;

    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId: tenantAId,
        type: 'VAN',
        capacityWeightKg: 200,
        riderId: riderAId,
      },
    });
    vehicleId = vehicle.id;

    // Tenant B fixtures - used only for the tenant-isolation test.
    await prisma.user.create({
      data: {
        tenantId: tenantBId,
        email: 'retailer@b.example',
        passwordHash,
        role: 'RETAILER',
      },
    });

    retailerToken = await login(tenantSlugA, 'retailer@a.example');
    dispatcherToken = await login(tenantSlugA, 'dispatcher@a.example');
    riderAToken = await login(tenantSlugA, 'rider-a@a.example');
    riderBToken = await login(tenantSlugA, 'rider-b@a.example');
    managerAdminToken = await login(tenantSlugA, 'manager@a.example');

    const customer = await request(app.getHttpServer())
      .post('/api/v1/customers')
      .set(authed(retailerToken))
      .send({
        name: 'Jane Customer',
        phoneNumber: '+254700000000',
        address: '123 Main St',
      })
      .expect(201);
    customerId = customer.body.id;
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({
      where: { slug: { in: [tenantSlugA, tenantSlugB] } },
    });
    await app.close();
  });

  describe('the full happy path', () => {
    let deliveryId: string;

    it('creates a delivery (idempotency key required)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/deliveries')
        .set(authed(retailerToken))
        .set('Idempotency-Key', 'critical-path-create-1')
        .send({
          customerId,
          pickupAddress: '1 Warehouse Rd',
          dropoffAddress: '123 Main St',
          weightKg: 50,
        })
        .expect(201);

      deliveryId = res.body.id;
      expect(res.body.status).toBe('REQUESTED');
    });

    it('rejects delivery creation with no Idempotency-Key header', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/deliveries')
        .set(authed(retailerToken))
        .send({ customerId, pickupAddress: 'x', dropoffAddress: 'y' })
        .expect(400);
    });

    it('scenario 5: a retried create with the SAME idempotency key returns the SAME delivery, not a duplicate', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/deliveries')
        .set(authed(retailerToken))
        .set('Idempotency-Key', 'critical-path-create-1') // same key as above
        .send({
          customerId,
          pickupAddress:
            'DIFFERENT ADDRESS - should be ignored, this is a replay',
          dropoffAddress: '123 Main St',
        })
        .expect(201);

      expect(res.body.id).toBe(deliveryId);

      const count = await prisma.delivery.count({
        where: { tenantId: tenantAId },
      });
      expect(count).toBe(1); // not 2
    });

    it('dispatcher sees the rider as a ranked candidate', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/deliveries/${deliveryId}/candidates`)
        .set(authed(dispatcherToken))
        .expect(200);

      expect(res.body.some((c: any) => c.riderId === riderAId)).toBe(true);
    });

    it('dispatcher assigns the delivery', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/deliveries/${deliveryId}/assign`)
        .set(authed(dispatcherToken))
        .send({ riderId: riderAId, vehicleId })
        .expect(200);

      expect(res.body.status).toBe('ASSIGNED');
      expect(res.body.riderId).toBe(riderAId);
    });

    it('scenario 2: rider B (not assigned) cannot see or transition this delivery (404, not 403)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/deliveries/${deliveryId}/status`)
        .set(authed(riderBToken))
        .send({ toStatus: 'ACCEPTED' })
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('the assigned rider (A) accepts the delivery', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/deliveries/${deliveryId}/status`)
        .set(authed(riderAToken))
        .send({ toStatus: 'ACCEPTED' })
        .expect(200);

      expect(res.body.status).toBe('ACCEPTED');
    });

    it('scenario 6: an invalid transition (ACCEPTED -> IN_TRANSIT, skipping PICKED_UP) is rejected with 422', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/deliveries/${deliveryId}/status`)
        .set(authed(riderAToken))
        .send({ toStatus: 'IN_TRANSIT' })
        .expect(422);

      expect(res.body.error.code).toBe('BUSINESS_RULE_VIOLATION');
    });

    it('rider marks PICKED_UP then IN_TRANSIT', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/deliveries/${deliveryId}/status`)
        .set(authed(riderAToken))
        .send({ toStatus: 'PICKED_UP' })
        .expect(200);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/deliveries/${deliveryId}/status`)
        .set(authed(riderAToken))
        .send({ toStatus: 'IN_TRANSIT' })
        .expect(200);

      expect(res.body.status).toBe('IN_TRANSIT');
    });

    it('the generic status endpoint rejects DELIVERED as a target (must use proof-of-delivery, ADR-013)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/deliveries/${deliveryId}/status`)
        .set(authed(riderAToken))
        .send({ toStatus: 'DELIVERED' })
        .expect(422);

      expect(res.body.error.message).toContain('proof-of-delivery');
    });

    let proofToken: string;

    it('rider requests a proof-of-delivery token', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/proof-of-delivery/request`)
        .set(authed(riderAToken))
        .expect(201);

      proofToken = res.body.token;
      expect(proofToken).toMatch(/^[a-f0-9]{64}$/);
    });

    it('rejects an incorrect proof token', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/proof-of-delivery/confirm`)
        .set(authed(riderAToken))
        .send({ token: 'f'.repeat(64) })
        .expect(422);
    });

    it('confirms the correct proof token and transitions to DELIVERED', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/proof-of-delivery/confirm`)
        .set(authed(riderAToken))
        .send({ token: proofToken })
        .expect(200);

      expect(res.body.status).toBe('DELIVERED');
      expect(res.body.deliveredAt).not.toBeNull();
    });

    it('rejects reusing the same (now-consumed) proof token - single-use enforcement', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/deliveries/${deliveryId}/proof-of-delivery/confirm`)
        .set(authed(riderAToken))
        .send({ token: proofToken })
        .expect(422);
    });

    it('scenario 7: delivery history is preserved and matches the full transition sequence', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/deliveries/${deliveryId}`)
        .set(authed(dispatcherToken))
        .expect(200);

      const toStatuses = res.body.statusEvents.map((e: any) => e.toStatus);
      expect(toStatuses).toEqual([
        'REQUESTED',
        'ASSIGNED',
        'ACCEPTED',
        'PICKED_UP',
        'IN_TRANSIT',
        'DELIVERED',
      ]);
    });

    it('DELIVERED is terminal - no further transition is accepted', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/deliveries/${deliveryId}/status`)
        .set(authed(riderAToken))
        .send({ toStatus: 'FAILED' })
        .expect(422);
    });
  });

  describe('scenario 3: the assignment race - two dispatchers, one delivery', () => {
    it('exactly one of two concurrent assignment requests succeeds', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/deliveries')
        .set(authed(retailerToken))
        .set('Idempotency-Key', `race-test-${Date.now()}`)
        .send({
          customerId,
          pickupAddress: 'race start',
          dropoffAddress: 'race end',
        })
        .expect(201);
      const raceDeliveryId = created.body.id;

      const secondVehicle = await prisma.vehicle.create({
        data: {
          tenantId: tenantAId,
          type: 'MOTORCYCLE',
          capacityWeightKg: 20,
          riderId: riderBId,
        },
      });

      const [resultA, resultB] = await Promise.allSettled([
        request(app.getHttpServer())
          .patch(`/api/v1/deliveries/${raceDeliveryId}/assign`)
          .set(authed(dispatcherToken))
          .send({ riderId: riderAId, vehicleId }),
        request(app.getHttpServer())
          .patch(`/api/v1/deliveries/${raceDeliveryId}/assign`)
          .set(authed(dispatcherToken))
          .send({ riderId: riderBId, vehicleId: secondVehicle.id }),
      ]);

      const statuses = [resultA, resultB].map((r) =>
        r.status === 'fulfilled' ? (r.value as any).status : null,
      );
      const successCount = statuses.filter((s) => s === 200).length;
      const conflictCount = statuses.filter((s) => s === 409).length;

      expect(successCount).toBe(1);
      expect(conflictCount).toBe(1);

      const final = await prisma.delivery.findUnique({
        where: { id: raceDeliveryId },
      });
      expect(final?.status).toBe('ASSIGNED');
      expect([riderAId, riderBId]).toContain(final?.riderId);
    });
  });

  describe('scenario 1: tenant isolation', () => {
    it('a tenant B user cannot see a tenant A delivery (404, not 403 - existence not confirmed)', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/deliveries')
        .set(authed(retailerToken))
        .set('Idempotency-Key', `isolation-test-${Date.now()}`)
        .send({ customerId, pickupAddress: 'x', dropoffAddress: 'y' })
        .expect(201);

      const tenantBToken = await login(tenantSlugB, 'retailer@b.example');

      const res = await request(app.getHttpServer())
        .get(`/api/v1/deliveries/${created.body.id}`)
        .set(authed(tenantBToken))
        .expect(404);

      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('administration: invite endpoint (ADR-015)', () => {
    it('a MANAGER_ADMIN can create a new rider, who can then log in', async () => {
      const newRiderEmail = 'invited-rider@a.example';
      await request(app.getHttpServer())
        .post('/api/v1/admin/users')
        .set(authed(managerAdminToken))
        .send({
          email: newRiderEmail,
          password: 'a-fine-initial-password',
          role: 'RIDER',
        })
        .expect(201);

      // Closes the gap ADR-015 specifically calls out: a RIDER-role user
      // must have a corresponding Rider row, created in the same
      // transaction as the User itself.
      const createdUser = await prisma.user.findFirst({
        where: { email: newRiderEmail },
      });
      const riderProfile = await prisma.rider.findUnique({
        where: { userId: createdUser?.id },
      });
      expect(riderProfile).not.toBeNull();

      // And the new account is immediately usable.
      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          tenantSlug: tenantSlugA,
          email: newRiderEmail,
          password: 'a-fine-initial-password',
        })
        .expect(200);
      expect(loginRes.body.accessToken).toBeDefined();

      await prisma.user.deleteMany({ where: { email: newRiderEmail } });
    });

    it('rejects an attempt to assign SYSTEM_ADMIN via this endpoint', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/users')
        .set(authed(managerAdminToken))
        .send({
          email: 'wannabe-superadmin@a.example',
          password: 'irrelevant-password',
          role: 'SYSTEM_ADMIN',
        })
        .expect(400); // rejected by DTO validation (@IsIn) before it ever reaches the service layer
    });

    it('a RIDER cannot call the admin endpoint at all (role-gated)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/users')
        .set(authed(riderAToken))
        .send({
          email: 'x@a.example',
          password: 'irrelevant-password',
          role: 'RIDER',
        })
        .expect(403);
    });
  });

  describe('retailer cancellation', () => {
    it('a retailer can cancel a REQUESTED delivery', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/deliveries')
        .set(authed(retailerToken))
        .set('Idempotency-Key', `cancel-test-${Date.now()}`)
        .send({ customerId, pickupAddress: 'x', dropoffAddress: 'y' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/v1/deliveries/${created.body.id}/cancel`)
        .set(authed(retailerToken))
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');
    });

    it('a rider cannot cancel a delivery (role-gated - retailer/admin only)', async () => {
      const created = await request(app.getHttpServer())
        .post('/api/v1/deliveries')
        .set(authed(retailerToken))
        .set('Idempotency-Key', `cancel-test-2-${Date.now()}`)
        .send({ customerId, pickupAddress: 'x', dropoffAddress: 'y' })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/v1/deliveries/${created.body.id}/cancel`)
        .set(authed(riderAToken))
        .expect(403);
    });
  });
});
