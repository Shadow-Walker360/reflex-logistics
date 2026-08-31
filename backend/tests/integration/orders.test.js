const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');

// NOTE: these tests expect a real (test/dev) database reachable via DATABASE_URL,
// seeded via `npm run prisma:seed`. They're integration tests by design —
// the repository layer is thin enough that mocking it would just test the mock.

process.env.NODE_ENV = 'development';

let app, supertest, request, signRepToken;

before(async () => {
  supertest = require('supertest');
  app = require('../../src/app');
  request = supertest(app);
  ({ signRepToken } = require('../../src/lib/repToken'));
});

test('GET /api/orders/:orderId returns 400 for a malformed order ID', async () => {
  const res = await request.get('/api/orders/not-an-id').query({ email: 'user@example.com' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'VALIDATION_ERROR');
});

test('GET /api/orders/:orderId as customer requires email', async () => {
  const res = await request.get('/api/orders/NS-10492');
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'EMAIL_REQUIRED');
});

test('GET /api/orders/:orderId as customer with wrong email returns 403', async () => {
  const res = await request.get('/api/orders/NS-10492').query({ email: 'wrong@example.com' });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.code, 'EMAIL_MISMATCH');
});

test('GET /api/orders/:orderId as customer with correct email returns the order', async () => {
  const res = await request.get('/api/orders/NS-10492').query({ email: 'user@example.com' });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.orderId, 'NS-10492');
  assert.ok(Array.isArray(res.body.data.trackingEvents));
});

test('GET /api/orders/:orderId as rep with a validly signed token does not require email', async () => {
  const token = signRepToken('agent@northstar.com');
  const res = await request.get('/api/orders/NS-10492').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.orderId, 'NS-10492');
});

// Regression test for C-1: the old middleware accepted any string shaped
// like "rep:<email>" with no signature check at all. This proves that path
// is closed — a forged token in the same *shape* as a real one, but without
// a valid HMAC signature, must be rejected.
test('GET /api/orders/:orderId rejects a forged rep token (old bypass format)', async () => {
  const res = await request.get('/api/orders/NS-10492').set('Authorization', 'Bearer rep:attacker@evil.com');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'INVALID_SESSION');
});

test('GET /api/orders/:orderId rejects an expired rep token', async () => {
  const expiredToken = signRepToken('agent@northstar.com', -1000); // already expired
  const res = await request.get('/api/orders/NS-10492').set('Authorization', `Bearer ${expiredToken}`);
  assert.equal(res.status, 401);
  assert.equal(res.body.error.code, 'INVALID_SESSION');
});

test('GET /api/orders/:orderId for nonexistent order returns 404', async () => {
  const res = await request.get('/api/orders/NS-99999').query({ email: 'nobody@example.com' });
  assert.equal(res.status, 404);
});

test('POST /api/returns/:orderId rejects a duplicate return for the same order', async () => {
  const first = await request
    .post('/api/returns/NS-20871')
    .send({ reason: 'wrong_size', email: 'jordan@example.com' });
  // NS-20871 already has a seeded return, so the first call here is expected
  // to be the duplicate — this test documents that behavior either way.
  assert.ok([201, 400].includes(first.status));

  const second = await request
    .post('/api/returns/NS-20871')
    .send({ reason: 'damaged', email: 'jordan@example.com' });
  assert.equal(second.status, 400);
  assert.equal(second.body.error.code, 'RETURN_ALREADY_EXISTS');
});

after(async () => {
  const db = require('../../src/db/client');
  await db.$disconnect();
});
