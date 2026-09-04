import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

const redisClientProvider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService) => {
    const url = config.get<string>('redis.url');
    return new Redis(url as string, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  },
};

/**
 * Spec reference: Section 4.4 (Redis ADR-004) - Redis is scoped strictly to
 * cache / rate-limit / queue-backing / hot-location state. It is never a
 * source of truth for business state (Section 33: "stale cache must never
 * silently override authoritative database state").
 *
 * Exposed as a raw ioredis client via DI token rather than wrapped, because
 * BullMQ (Phase 3+) needs a real ioredis-compatible connection config, not
 * an abstraction over it.
 */
@Global()
@Module({
  providers: [redisClientProvider],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit();
  }
}
