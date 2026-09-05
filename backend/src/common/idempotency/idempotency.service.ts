import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AppException } from '../errors/app.exception';
import { AppErrorCode } from '../errors/app-error-codes';

/**
 * Spec reference: Section 15 (Idempotency).
 *
 * Generic wrapper around the IdempotencyKey model (existed since Phase 1,
 * unused until now). Scoped per (tenant, operationType, key) per the
 * model's unique constraint - a retailer retrying the same
 * Idempotency-Key header value for delivery creation gets back the exact
 * original response, never a second Delivery row.
 *
 * Usage pattern (see DeliveriesService.create for the real call site):
 *   const existing = await idempotency.checkExisting(tenantId, 'delivery.create', key);
 *   if (existing) return existing; // replay, no new work done
 *   const result = await doTheActualWork();
 *   await idempotency.recordCompleted(tenantId, 'delivery.create', key, result);
 *   return result;
 *
 * This is a check-then-act pattern, not a single atomic claim - see the
 * "Known limitation" note on checkExisting for the concurrent-duplicate-
 * request race this does NOT fully close, and why that's an accepted gap
 * for MVP rather than a silently ignored one.
 */
@Injectable()
export class IdempotencyService {
  constructor(private readonly prisma: PrismaService) {}

  async checkExisting(
    tenantId: string,
    operationType: string,
    key: string,
  ): Promise<{ responseBody: unknown; responseStatus: number } | null> {
    const existing = await this.prisma.idempotencyKey.findUnique({
      where: { tenantId_operationType_key: { tenantId, operationType, key } },
    });

    if (!existing) {
      return null;
    }

    if (existing.status === 'PENDING') {
      // A second request with the same key arrived while the first is
      // still being processed (e.g. a client retry firing before the
      // first attempt's response returned). Spec Section 15 calls for
      // blocking or a 409 here; 409 is chosen over blocking to avoid
      // holding an HTTP connection open indefinitely on the second
      // request, which has no way to know how long the first will take.
      throw new AppException(
        AppErrorCode.CONFLICT,
        'A request with this idempotency key is already being processed.',
      );
    }

    // COMPLETED (or FAILED, replayed the same way - a failed attempt's
    // recorded response is still the correct thing to replay verbatim
    // rather than silently retrying the underlying operation a second time).
    return {
      responseBody: existing.responseBody,
      responseStatus: existing.responseStatus ?? 200,
    };
  }

  async markPending(
    tenantId: string,
    operationType: string,
    key: string,
  ): Promise<void> {
    await this.prisma.idempotencyKey.create({
      data: { tenantId, operationType, key, status: 'PENDING' },
    });
  }

  async recordCompleted(
    tenantId: string,
    operationType: string,
    key: string,
    responseBody: unknown,
    responseStatus = 201,
  ): Promise<void> {
    await this.prisma.idempotencyKey.update({
      where: { tenantId_operationType_key: { tenantId, operationType, key } },
      data: {
        status: 'COMPLETED',
        responseBody: responseBody as any,
        responseStatus,
      },
    });
  }

  /**
   * Known limitation (documented, not silently accepted): checkExisting +
   * markPending is two round-trips, not one atomic claim. Two truly
   * simultaneous requests with the same key could both pass checkExisting
   * (seeing nothing yet) before either calls markPending - the SECOND
   * markPending call will then fail on the model's unique constraint
   * (tenantId, operationType, key), which the caller must catch and treat
   * as "someone else claimed this key first" (map to the same 409 as the
   * PENDING case above). DeliveriesService.create does this. A fully
   * atomic claim (e.g. a single INSERT ... ON CONFLICT DO NOTHING RETURNING)
   * would close this gap entirely but needs raw SQL; deferred until this
   * proves to be a real problem rather than a theoretical one; race
   * window is a single database round-trip, not a meaningfully exploitable
   * window in practice.
   */
  isUniqueConstraintViolation(error: any): boolean {
    return error?.code === 'P2002';
  }
}
