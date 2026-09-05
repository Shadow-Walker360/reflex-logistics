import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

/**
 * Injectable Prisma client.
 *
 * Spec reference: Section 4.3 (Prisma ADR-003) — Prisma is the default
 * data-access layer, with raw-SQL escape hatches (via $queryRaw/$executeRaw
 * on this same client) for the RLS session-context and optimistic-
 * concurrency patterns described in Sections 8 and 14. Those call sites are
 * built in Phase 3/4, not here — this class only owns the connection
 * lifecycle so every module shares one client/connection pool.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(config: ConfigService) {
    super({
      datasources: {
        db: {
          url: config.get<string>('database.url'),
        },
      },
      log: [
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' },
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Used by the readiness probe (Section 43) — a cheap query that proves
   * the connection is actually usable, not just that $connect() resolved
   * once at boot.
   */
  async isHealthy(): Promise<boolean> {
    await this.$queryRaw`SELECT 1`;
    return true;
  }
}
