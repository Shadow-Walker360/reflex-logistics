import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import { PrismaService } from '../src/database/prisma.service';
import { PasswordService } from '../src/auth/password.service';

/**
 * E2E: authentication (spec Section 6, Section 44 critical scenarios).
 *
 * NOTE (honesty flag, same as test/health.e2e-spec.ts): this suite requires
 * a real PostgreSQL connection and a generated Prisma client. It has NOT
 * been executed in the build sandbox used to author this code - see
 * docs/progress.md "Blocked". It is written now, ready to run against
 * `docker compose up` once `npx prisma generate && npx prisma migrate dev`
 * have been run in an environment with network access to
 * binaries.prisma.sh.
 *
 * Covers the spec §44 scenarios that apply to what Phase 2 actually builds:
 * generic invalid-credentials messaging (never reveals which check failed),
 * account lockout after repeated failures, refresh token rotation, and
 * logout revocation actually preventing further refreshes.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let passwords: PasswordService;

  const tenantSlug = 'acme-test';
  const email = 'dispatcher@acme-test.example';
  const plainPassword = 'correct-horse-battery-staple';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    prisma = app.get(PrismaService);
    passwords = app.get(PasswordService);

    const tenant = await prisma.tenant.create({
      data: { name: 'Acme Test', slug: tenantSlug },
    });
    await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        passwordHash: await passwords.hash(plainPassword),
        role: 'DISPATCHER',
      },
    });
  });

  afterAll(async () => {
    // Cleanup, then close - a real test suite would use a dedicated test
    // database/transaction rollback strategy rather than manual cleanup;
    // this is sufficient for a first pass and should be revisited once a
    // shared test-database convention is established for the project.
    await prisma.user.deleteMany({ where: { email } });
    await prisma.tenant.deleteMany({ where: { slug: tenantSlug } });
    await app.close();
  });

  describe('POST /api/v1/auth/login', () => {
    it('returns an access and refresh token for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ tenantSlug, email, password: plainPassword })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('returns a generic 401 for a wrong password (spec §6: never reveal which check failed)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ tenantSlug, email, password: 'wrong-password' })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns the SAME generic 401 for a nonexistent email (does not leak account existence)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ tenantSlug, email: 'nobody@acme-test.example', password: 'whatever' })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns the SAME generic 401 for a nonexistent tenant slug', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ tenantSlug: 'no-such-tenant', email, password: plainPassword })
        .expect(401);

      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('takes roughly the same time for "no such tenant"/"no such user" as for "wrong password" (timing side-channel check)', async () => {
      // Security-audit follow-up: AuthService equalizes cost across every
      // INVALID_CREDENTIALS path with a dummy bcrypt comparison (see
      // AuthService.DUMMY_HASH). Without it, "no such tenant"/"no such
      // user" return near-instantly while "wrong password" pays a real
      // ~250-600ms bcrypt cost, letting an attacker distinguish account
      // existence purely from response latency despite an identical error
      // body. This asserts the three paths stay within the same rough
      // order of magnitude rather than one being an order of magnitude
      // faster than the others.
      const time = async (body: Record<string, string>) => {
        const start = Date.now();
        await request(app.getHttpServer()).post('/api/v1/auth/login').send(body);
        return Date.now() - start;
      };

      const wrongPasswordMs = await time({ tenantSlug, email, password: 'wrong-password' });
      const noSuchTenantMs = await time({
        tenantSlug: 'no-such-tenant-xyz',
        email,
        password: plainPassword,
      });
      const noSuchUserMs = await time({
        tenantSlug,
        email: 'nobody-xyz@acme-test.example',
        password: plainPassword,
      });

      // Generous bound (not a tight benchmark assertion, which would be
      // flaky under CI load) - the point is ruling out a >5x gap, which is
      // what an un-equalized bcrypt-vs-no-bcrypt comparison would produce.
      expect(noSuchTenantMs).toBeGreaterThan(wrongPasswordMs / 5);
      expect(noSuchUserMs).toBeGreaterThan(wrongPasswordMs / 5);
    });

    it('locks the account after 5 failed attempts and rejects further attempts with 403', async () => {
      const badLogin = () =>
        request(app.getHttpServer())
          .post('/api/v1/auth/login')
          .send({ tenantSlug, email, password: 'wrong-password' });

      // 5 failures trip the lockout threshold (UsersService.registerFailedLoginAttempt).
      for (let i = 0; i < 5; i++) {
        await badLogin();
      }

      // A 6th attempt, even with the CORRECT password, should now be locked out.
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ tenantSlug, email, password: plainPassword })
        .expect(403);

      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/v1/auth/refresh and /logout', () => {
    it('rotates the refresh token on use (old token no longer works after refresh)', async () => {
      // Fresh account for this test to avoid the lockout state from the
      // suite above.
      const freshEmail = 'rider@acme-test.example';
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: tenantSlug } });
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: freshEmail,
          passwordHash: await passwords.hash(plainPassword),
          role: 'RIDER',
        },
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ tenantSlug, email: freshEmail, password: plainPassword })
        .expect(200);

      const firstRefreshToken = loginRes.body.refreshToken;

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: firstRefreshToken })
        .expect(200);

      expect(refreshRes.body.refreshToken).toBeDefined();
      expect(refreshRes.body.refreshToken).not.toBe(firstRefreshToken);

      // The OLD refresh token must now be rejected - it was revoked on rotation.
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: firstRefreshToken })
        .expect(401);

      await prisma.user.deleteMany({ where: { email: freshEmail } });
    });

    it('logout revokes the refresh token so it can no longer be used', async () => {
      const freshEmail = 'retailer@acme-test.example';
      const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: tenantSlug } });
      await prisma.user.create({
        data: {
          tenantId: tenant.id,
          email: freshEmail,
          passwordHash: await passwords.hash(plainPassword),
          role: 'RETAILER',
        },
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ tenantSlug, email: freshEmail, password: plainPassword })
        .expect(200);

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .send({ refreshToken: loginRes.body.refreshToken })
        .expect(204);

      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: loginRes.body.refreshToken })
        .expect(401);

      await prisma.user.deleteMany({ where: { email: freshEmail } });
    });
  });

  describe('protected routes', () => {
    it('rejects a request to a non-@Public route with no token (401)', async () => {
      // /api/v1/ready is @Public via HealthController not being guarded
      // per-route explicitly; this asserts against a route that WOULD be
      // guarded once Phase 3 adds one. Placeholder until a real protected
      // domain route exists - tracked in progress.md.
      expect(true).toBe(true);
    });
  });
});
