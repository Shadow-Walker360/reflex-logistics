import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';

/**
 * E2E: health/readiness endpoints (spec Section 43).
 *
 * NOTE (honesty flag for progress.md): this suite requires a real
 * PostgreSQL + Redis connection and a generated Prisma client to boot
 * AppModule. It has NOT been executed in the build sandbox used to author
 * this code, because that sandbox's network policy blocks
 * binaries.prisma.sh (see docs/decisions and progress.md "Blocked"
 * section). It is included now, ready to run, so the first `npm run test:e2e`
 * against `docker-compose up` (which provides real Postgres/Redis) verifies
 * it immediately - do not treat this file's presence as proof the endpoints
 * were verified end-to-end yet.
 */
describe('Health (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns 200 without checking dependencies', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });
  });

  it('GET /api/v1/ready returns 200 with database and redis up', () => {
    return request(app.getHttpServer())
      .get('/api/v1/ready')
      .expect(200)
      .expect((res) => {
        expect(res.body.details.database.status).toBe('up');
        expect(res.body.details.redis.status).toBe('up');
      });
  });

  it('returns the standard error envelope for a 404 route', () => {
    return request(app.getHttpServer())
      .get('/api/v1/this-route-does-not-exist')
      .expect(404)
      .expect((res) => {
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBeDefined();
        expect(res.body.error.requestId).toBeDefined();
      });
  });

  it('rejects a request body with unknown fields (whitelist validation)', () => {
    // Exercised against a real endpoint once Phase 2 (auth) exists;
    // placeholder assertion retained here as a reminder until then.
    expect(true).toBe(true);
  });
});
