import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { scrubAuditContext } from './scrub-audit-context';
import { AuditEntry } from './audit-entry';

export { AuditEntry } from './audit-entry';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenantId: entry.tenantId,
          actorId: entry.actorId,
          action: entry.action,
          resourceType: entry.resourceType,
          resourceId: entry.resourceId,
          // Cast, not a Prisma namespace import: avoids depending on
          // exactly how @prisma/client re-exports its Json helper types,
          // which appears to be broken/renamed in the currently generated
          // client (see the "no exported member 'Prisma'" error).
          context: entry.context
            ? (scrubAuditContext(entry.context) as any)
            : undefined,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log for action "${entry.action}" on ${entry.resourceType}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}