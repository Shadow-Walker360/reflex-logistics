import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckError,
  HealthCheckService,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

/**
 * Spec reference: Section 43 (Health / Readiness).
 *
 * Liveness (`/health`) answers "is the process itself alive" and
 * deliberately does NOT check dependencies - a slow/down database should
 * cause this instance to be drained from load-balancer rotation (readiness
 * failing), not restarted (which would not fix a database outage and would
 * just cause a restart loop).
 *
 * Readiness (`/ready`) checks the dependencies that must be reachable for
 * this instance to correctly serve traffic: PostgreSQL and Redis. A failed
 * check returns HTTP 503, matching Section 27's error model.
 */
@ApiTags('health')
@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get('health')
  @HealthCheck()
  liveness() {
    return this.health.check([]);
  }

  @Get('ready')
  @HealthCheck()
  readiness() {
    return this.health.check([
      (): Promise<HealthIndicatorResult> => this.checkDatabase(),
      (): Promise<HealthIndicatorResult> => this.checkRedis(),
    ]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.isHealthy();
      return { database: { status: 'up' } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new HealthCheckError('Database check failed', {
        database: { status: 'down', message },
      });
    }
  }

  private async checkRedis(): Promise<HealthIndicatorResult> {
    try {
      const pong = await this.redis.ping();
      if (pong !== 'PONG') {
        throw new Error(`unexpected ping response: ${pong}`);
      }
      return { redis: { status: 'up' } };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new HealthCheckError('Redis check failed', {
        redis: { status: 'down', message },
      });
    }
  }
}
