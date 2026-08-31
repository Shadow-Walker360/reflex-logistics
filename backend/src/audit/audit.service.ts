import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { scrubAuditContext } from './scrub-audit-context';

export interface AuditEntry {
  tenantId?: string;
  actorId?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  context?: Record<string, unknown>;
}

/**
 * Spec reference: Section 40 (Auditing).
 *
 * Deliberately fire-and-forget-tolerant in one specific sense: a failure
 * to write an audit record must never fail the business operation it is
 * documenting (e.g. a DB hiccup writing the audit row for a successful
 * login should not turn that into a failed login). The write is still
 * attempted synchronously and logged loudly on failure so the gap is
 * visible in logs/monitoring, not silently swallowed.
 *
 * Never logs secrets - callers must not pass password/token values in
 * `context`; see the denylist note inline below.
 */
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
          context: entry.context ? scrubAuditContext(entry.context) : undefined,
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
