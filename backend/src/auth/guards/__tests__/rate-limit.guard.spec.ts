import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from '../rate-limit.guard';
import { AppException } from '../../../common/errors/app.exception';
import { AppErrorCode } from '../../../common/errors/app-error-codes';

function makeContext(
  overrides: Record<string, unknown> = {},
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ ip: '203.0.113.5', ...overrides }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard', () => {
  it('allows the request through when no @RateLimit() is declared on the route', async () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    const redis = { incr: jest.fn(), expire: jest.fn() } as any;
    const guard = new RateLimitGuard(reflector, redis);

    const result = await guard.canActivate(makeContext());

    expect(result).toBe(true);
    expect(redis.incr).not.toHaveBeenCalled();
  });

  it('allows the request when under the limit', async () => {
    const reflector = {
      getAllAndOverride: () => ({ name: 'login', limit: 5, windowSeconds: 60 }),
    } as unknown as Reflector;
    const redis = {
      incr: jest.fn().mockResolvedValue(3),
      expire: jest.fn(),
    } as any;
    const guard = new RateLimitGuard(reflector, redis);

    const result = await guard.canActivate(makeContext());

    expect(result).toBe(true);
  });

  it('sets an expiry only on the first request in the window', async () => {
    const reflector = {
      getAllAndOverride: () => ({ name: 'login', limit: 5, windowSeconds: 60 }),
    } as unknown as Reflector;
    const redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
    } as any;
    const guard = new RateLimitGuard(reflector, redis);

    await guard.canActivate(makeContext());

    expect(redis.expire).toHaveBeenCalledWith(
      expect.stringContaining('ratelimit:login:'),
      60,
    );
  });

  it('does not re-set expiry on subsequent requests within the window', async () => {
    const reflector = {
      getAllAndOverride: () => ({ name: 'login', limit: 5, windowSeconds: 60 }),
    } as unknown as Reflector;
    const redis = {
      incr: jest.fn().mockResolvedValue(2),
      expire: jest.fn(),
    } as any;
    const guard = new RateLimitGuard(reflector, redis);

    await guard.canActivate(makeContext());

    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('throws AppException(RATE_LIMITED) once the limit is exceeded', async () => {
    const reflector = {
      getAllAndOverride: () => ({ name: 'login', limit: 5, windowSeconds: 60 }),
    } as unknown as Reflector;
    const redis = {
      incr: jest.fn().mockResolvedValue(6),
      expire: jest.fn(),
    } as any;
    const guard = new RateLimitGuard(reflector, redis);

    await expect(guard.canActivate(makeContext())).rejects.toThrow(
      AppException,
    );
    try {
      await guard.canActivate(makeContext());
    } catch (e) {
      expect((e as AppException).code).toBe(AppErrorCode.RATE_LIMITED);
    }
  });

  it('scopes the counter key per client IP (req.ip, NOT raw X-Forwarded-For)', async () => {
    const reflector = {
      getAllAndOverride: () => ({ name: 'login', limit: 5, windowSeconds: 60 }),
    } as unknown as Reflector;
    const redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
    } as any;
    const guard = new RateLimitGuard(reflector, redis);

    // req.ip is what Express computes - correctly derived from
    // X-Forwarded-For ONLY when 'trust proxy' is enabled (main.ts), so the
    // guard trusting req.ip (not parsing the header itself) is what makes
    // the trust boundary a single, consistent setting.
    await guard.canActivate(makeContext({ ip: '198.51.100.9' }));

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:login:198.51.100.9');
  });

  it('does NOT trust a raw X-Forwarded-For header when req.ip disagrees (spoofing check)', async () => {
    // Simulates the untrusted-proxy scenario directly: a malicious client
    // sends X-Forwarded-For, but since 'trust proxy' is off, Express's
    // req.ip reflects the real socket address regardless of what the
    // header says. The guard must key off req.ip, not re-derive from the
    // header itself.
    const reflector = {
      getAllAndOverride: () => ({ name: 'login', limit: 5, windowSeconds: 60 }),
    } as unknown as Reflector;
    const redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
    } as any;
    const guard = new RateLimitGuard(reflector, redis);

    await guard.canActivate(
      makeContext({
        ip: '203.0.113.5', // real socket address, as Express would report with trust proxy off
        headers: { 'x-forwarded-for': '1.2.3.4' }, // attacker-supplied, should be ignored
      }),
    );

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:login:203.0.113.5');
  });

  it('fails OPEN (allows the request) when Redis throws on incr, and logs the error', async () => {
    const reflector = {
      getAllAndOverride: () => ({ name: 'login', limit: 5, windowSeconds: 60 }),
    } as unknown as Reflector;
    const redis = {
      incr: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      expire: jest.fn(),
    } as any;
    const guard = new RateLimitGuard(reflector, redis);

    const result = await guard.canActivate(makeContext());

    expect(result).toBe(true);
  });

  it('falls back to socket.remoteAddress when req.ip is unavailable', async () => {
    const reflector = {
      getAllAndOverride: () => ({ name: 'login', limit: 5, windowSeconds: 60 }),
    } as unknown as Reflector;
    const redis = {
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn(),
    } as any;
    const guard = new RateLimitGuard(reflector, redis);

    await guard.canActivate(
      makeContext({ ip: undefined, socket: { remoteAddress: '10.0.0.7' } }),
    );

    expect(redis.incr).toHaveBeenCalledWith('ratelimit:login:10.0.0.7');
  });
});
