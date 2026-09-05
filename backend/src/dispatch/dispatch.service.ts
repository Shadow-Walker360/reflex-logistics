import { Inject, Injectable } from '@nestjs/common';
import { AppException } from '../common/errors/app.exception';
import { AppErrorCode } from '../common/errors/app-error-codes';
import { DeliveryStatus } from '../deliveries/domain/delivery-state-machine';
import { rankCandidates } from './ranking';
import {
  DISPATCH_DB,
  DISPATCH_AUDIT,
  DISPATCH_VEHICLES,
} from './dispatch-db.token';
import { AuditEntry } from '../audit/audit-entry';

/**
 * Narrow structural interface describing only the Prisma methods
 * DispatchService actually calls. See dispatch-db.token.ts for why this
 * exists instead of a direct PrismaService type reference. The real
 * PrismaService satisfies this interface structurally (Prisma's generated
 * client's method signatures are a superset of this), so production
 * wiring (dispatch.module.ts) needs no adapter - only the type reference
 * is narrowed, not the runtime object.
 */
export interface DispatchDatabaseClient {
  delivery: {
    findFirst(args: { where: Record<string, unknown> }): Promise<any>;
    updateMany(args: {
      where: Record<string, unknown>;
      data: Record<string, unknown>;
    }): Promise<{ count: number }>;
    findUniqueOrThrow(args: { where: Record<string, unknown> }): Promise<any>;
    count(args: { where: Record<string, unknown> }): Promise<number>;
  };
  rider: {
    findFirst(args: { where: Record<string, unknown> }): Promise<any>;
    findMany(args: {
      where: Record<string, unknown>;
      include?: Record<string, unknown>;
    }): Promise<any[]>;
  };
  vehicle: {
    findFirst(args: { where: Record<string, unknown> }): Promise<any>;
  };
  deliveryStatusEvent: {
    create(args: { data: Record<string, unknown> }): Promise<any>;
  };
  $transaction<T>(fn: (tx: DispatchDatabaseClient) => Promise<T>): Promise<T>;
}

/** Narrow interface for the audit dependency - see dispatch-db.token.ts. */
export interface AuditRecorder {
  record(entry: AuditEntry): Promise<void>;
}

/** Narrow interface for the vehicle-eligibility dependency - see dispatch-db.token.ts. */
export interface VehicleEligibilityChecker {
  isEligible(
    vehicle: { capacityWeightKg: number },
    requiredWeightKg: number | null | undefined,
  ): boolean;
}

/**
 * Spec reference: Section 14 (Concurrency) - the flagship scenario: "two
 * dispatchers attempt to assign the same delivery simultaneously... only
 * one may win."
 *
 * Implementation note (deviates from ADR-003's anticipated approach):
 * ADR-003 anticipated needing raw SQL ($executeRaw) for this pattern.
 * Prisma's `updateMany()` returns `{ count }` - the affected-row-count
 * this pattern needs - natively, so the conditional
 * `UPDATE ... WHERE id = ? AND status = ?` from the spec's own example is
 * expressed directly as
 * `prisma.delivery.updateMany({ where: { id, status: {in: [...]} }, data })`
 * with no raw SQL required. This is a simplification discovered while
 * building this service, not a deviation from the underlying guarantee -
 * `updateMany` compiles to the same single conditional UPDATE statement.
 *
 * The valid "assignable from" statuses are REQUESTED (initial assignment)
 * and REASSIGNMENT_REQUIRED (fallback dispatch, spec Section 20) - both
 * transition to ASSIGNED per the state machine (delivery-state-machine.ts),
 * so one function correctly serves both call sites rather than
 * duplicating the conditional-update logic.
 */
@Injectable()
export class DispatchService {
  private static readonly ASSIGNABLE_FROM: DeliveryStatus[] = [
    'REQUESTED',
    'REASSIGNMENT_REQUIRED',
  ];

  constructor(
    @Inject(DISPATCH_DB) private readonly prisma: DispatchDatabaseClient,
    @Inject(DISPATCH_AUDIT) private readonly audit: AuditRecorder,
    @Inject(DISPATCH_VEHICLES)
    private readonly vehicles: VehicleEligibilityChecker,
  ) {}

  async assign(
    tenantId: string,
    actorUserId: string,
    deliveryId: string,
    riderId: string,
    vehicleId: string,
  ) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId },
    });
    if (!delivery) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Delivery not found.');
    }

    const rider = await this.prisma.rider.findFirst({
      where: { id: riderId, tenantId },
    });
    if (!rider) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Rider not found.');
    }
    if (!rider.isAvailable) {
      throw new AppException(
        AppErrorCode.BUSINESS_RULE_VIOLATION,
        'Rider is not currently available.',
      );
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId },
    });
    if (!vehicle) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Vehicle not found.');
    }
    // Spec Section 18: eligibility is a hard filter, checked before any
    // ranking would ever apply (ranking itself is not implemented - see
    // docs/dispatch.md - eligibility alone is what MVP enforces).
    if (!this.vehicles.isEligible(vehicle, delivery.weightKg)) {
      throw new AppException(
        AppErrorCode.BUSINESS_RULE_VIOLATION,
        "Vehicle does not meet this delivery's cargo requirements.",
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // The conditional update IS the concurrency guarantee (spec Section
      // 14) - this WHERE clause, evaluated atomically by the database, is
      // what makes "only one dispatcher wins" true even under real
      // concurrent requests. The delivery.status value read above (in the
      // findFirst existence check) is informational only, used purely to
      // label the DeliveryStatusEvent's fromStatus for the audit trail -
      // it plays NO role in the actual correctness guarantee, which comes
      // entirely from this statement's WHERE clause being checked by the
      // database itself, not from anything read earlier in JS.
      const updateResult = await tx.delivery.updateMany({
        where: {
          id: deliveryId,
          tenantId,
          status: { in: DispatchService.ASSIGNABLE_FROM },
        },
        data: {
          riderId,
          vehicleId,
          status: 'ASSIGNED',
          assignedAt: new Date(),
        },
      });

      if (updateResult.count === 0) {
        // Spec Section 14: "If zero rows are affected: another process
        // won the race... Return an appropriate conflict response such as
        // HTTP 409." Thrown inside the transaction callback, which rolls
        // the (no-op) transaction back - nothing partial is left behind.
        throw new AppException(
          AppErrorCode.CONFLICT,
          'This delivery is no longer assignable - it may have already been assigned by another dispatcher, or is not in an assignable state.',
        );
      }

      await tx.deliveryStatusEvent.create({
        data: {
          deliveryId,
          fromStatus: delivery.status,
          toStatus: 'ASSIGNED',
          changedBy: actorUserId,
          metadata: { riderId, vehicleId },
        },
      });

      return tx.delivery.findUniqueOrThrow({ where: { id: deliveryId } });
    });

    await this.audit.record({
      tenantId,
      actorId: actorUserId,
      action: 'delivery.assigned',
      resourceType: 'Delivery',
      resourceId: deliveryId,
      context: { riderId, vehicleId },
    });

    return result;
  }

  /**
   * Spec Section 20 (Fallback Dispatch): the rider became unavailable
   * mid-delivery. Moves the delivery to REASSIGNMENT_REQUIRED so the
   * dispatch queue picks it back up - the actual re-assignment then goes
   * through assign() above, reusing the same conditional-update guarantee.
   */
  async requestReassignment(
    tenantId: string,
    actorUserId: string,
    deliveryId: string,
    reason: string,
  ) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId },
    });
    if (!delivery) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Delivery not found.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.delivery.updateMany({
        where: {
          id: deliveryId,
          tenantId,
          status: { in: ['ASSIGNED', 'ACCEPTED'] as DeliveryStatus[] },
        },
        data: { status: 'REASSIGNMENT_REQUIRED' },
      });

      if (updateResult.count === 0) {
        throw new AppException(
          AppErrorCode.CONFLICT,
          'This delivery is not currently in a state that can be flagged for reassignment.',
        );
      }

      await tx.deliveryStatusEvent.create({
        data: {
          deliveryId,
          fromStatus: delivery.status,
          toStatus: 'REASSIGNMENT_REQUIRED',
          changedBy: actorUserId,
          metadata: { reason },
        },
      });

      return tx.delivery.findUniqueOrThrow({ where: { id: deliveryId } });
    });

    await this.audit.record({
      tenantId,
      actorId: actorUserId,
      action: 'delivery.reassignment_requested',
      resourceType: 'Delivery',
      resourceId: deliveryId,
      context: { reason },
    });

    return result;
  }

  /**
   * Spec Section 18: eligibility (hard filter) followed by ranking (soft
   * ordering among eligible candidates). Returns a RANKED LIST for a
   * dispatcher to choose from - it does NOT auto-assign. "The frontend
   * displays the result. The backend owns the authoritative dispatch
   * rules" (spec's own words) - ranking logic lives here, not in the
   * frontend, but the actual assignment decision (which candidate to
   * pick) remains a dispatcher action via assign() above.
   *
   * Ranking signal is workload only (ADR reference: see ranking.ts's own
   * file comment for why - no RoutingService/lat-lng data exists yet to
   * support distance/ETA-based ranking).
   */
  async getCandidates(tenantId: string, deliveryId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId },
    });
    if (!delivery) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Delivery not found.');
    }

    const availableRiders = await this.prisma.rider.findMany({
      where: { tenantId, isAvailable: true },
      include: { vehicles: { where: { isActive: true } } },
    });

    // Eligibility (hard filter): a rider is a candidate only if at least
    // one of their active vehicles meets this delivery's cargo
    // requirement (spec Section 18/19). Deliberately evaluated per-rider
    // here rather than delegating to VehicleEligibilityChecker's
    // isEligible() in a query filter, since eligibility depends on the
    // SET of a rider's vehicles (any one matching is enough), not a
    // single vehicle in isolation.
    const eligible = availableRiders.filter((rider: any) =>
      rider.vehicles.some((vehicle: any) =>
        this.vehicles.isEligible(vehicle, delivery.weightKg),
      ),
    );

    // Workload: count of this rider's currently active deliveries
    // (ASSIGNED/ACCEPTED/PICKED_UP/IN_TRANSIT - the same "in-flight"
    // statuses used nowhere else as a named constant, kept inline here
    // since this is the only call site).
    const withWorkload = await Promise.all(
      eligible.map(async (rider: any) => ({
        riderId: rider.id as string,
        activeDeliveryCount: await this.prisma.delivery.count({
          where: {
            tenantId,
            riderId: rider.id,
            status: { in: ['ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT'] },
          },
        }),
        // First eligible vehicle is suggested - a rider with several
        // vehicles could have more than one that qualifies; the
        // dispatcher can override the suggestion at assignment time
        // regardless (assign() takes an explicit vehicleId).
        suggestedVehicleId: rider.vehicles.find((v: any) =>
          this.vehicles.isEligible(v, delivery.weightKg),
        )?.id as string,
      })),
    );

    const ranked = rankCandidates(
      withWorkload.map(({ riderId, activeDeliveryCount }) => ({
        riderId,
        activeDeliveryCount,
      })),
    );

    // Re-attach the suggested vehicle to each ranked entry.
    return ranked.map((r) => ({
      ...r,
      suggestedVehicleId: withWorkload.find((w) => w.riderId === r.riderId)
        ?.suggestedVehicleId,
    }));
  }
}
