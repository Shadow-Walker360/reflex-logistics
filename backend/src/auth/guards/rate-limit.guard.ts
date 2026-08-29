import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { AppErrorCode } from '../../common/errors/app-error-codes';
import { AppException } from '../../common/errors/app.exception';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimitOptions {
  /** Logical name for the counter, e.g. "login". Combined with the caller's IP. */
  name: string;
  /** Max attempts allowed within the window. */
  limit: number;
  /** Window size in seconds. */
  windowSeconds: number;
}

/**
 * Declares a rate limit for a route. Spec reference: Section 34 (Rate
 * Limiting) - "Authentication (login): Per-account + per-IP".
 *
 * This decorator applies the per-IP dimension generically for any route;
 * per-account limiting additionally requires knowing the account before
 * authentication succeeds (e.g. the email in a login body), which is
 * applied explicitly inside AuthService.login() rather than in this guard,
 * since the guard runs before body-specific business logic and account
 * lockout (Section 6) already provides the per-account protection.
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Sliding-window-ish (fixed-window, Redis INCR + EXPIRE) rate limiter.
 * A fixed window is a deliberate MVP simplification over a true sliding
 * window (e.g. sorted-set based) - it allows a burst of up to 2x the limit
 * at a window boundary, which is an accepted trade-off for MVP simplicity
 * and Redis-call efficiency (one INCR instead of a sorted-set add + trim +
 * count per request). Revisit if abuse patterns exploit the boundary.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const ip = this.extractIp(request);
    const key = `ratelimit:${options.name}:${ip}`;

    // Security fix (post-Phase-2 audit): a Redis outage previously caused
    // redis.incr()/expire() to throw, propagating as an unhandled 500 for
    // EVERY request on a rate-limited route - including login. That means
    // a brief Redis hiccup would take down the entire login flow, which is
    // worse than temporarily allowing unlimited login attempts (Section 28
    // "Redis unavailable" explicitly calls for graceful degradation, and
    // Section 34/6 rate limiting is deliberately NOT the only brute-force
    // defense - AuthService's DB-backed account lockout is a second,
    // independent layer that keeps working even if Redis is down). This
    // fails OPEN (allows the request) on a Redis error, logging loudly so
    // the outage is visible in monitoring rather than silently masked.
    let count: number;
    try {
      count = await this.redis.incr(key);
      if (count === 1) {
        await this.redis.expire(key, options.windowSeconds);
      }
    } catch (error) {
      this.logger.error(
        `Rate limiter Redis error for key "${key}" - failing open (allowing request)`,
        error instanceof Error ? error.stack : String(error),
      );
      return true;
    }

    if (count > options.limit) {
      throw new AppException(
        AppErrorCode.RATE_LIMITED,
        'Too many attempts. Please try again later.',
      );
    }

    return true;
  }

  private extractIp(request: any): string {
    // Security fix (post-Phase-2 audit): previously parsed X-Forwarded-For
    // directly, trusting it unconditionally regardless of deployment
    // topology - a client could set an arbitrary X-Forwarded-For value and
    // get a fresh rate-limit bucket on every single request, completely
    // defeating the limiter on any deployment that exposes the Node
    // process directly (e.g. the docker-compose.yml setup shipped in this
    // repo, which has no fronting reverse proxy). Now defers entirely to
    // Express's own req.ip, which ONLY considers X-Forwarded-For when
    // `app.set('trust proxy', ...)` has been explicitly enabled (see
    // main.ts, governed by the TRUST_PROXY env var, default false) -
    // making one setting the single source of truth for this trust
    // boundary instead of two places needing to agree.
    return request.ip || request.socket?.remoteAddress || 'unknown';
  }
}
