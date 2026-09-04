import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { AppException } from '../common/errors/app.exception';
import { AppErrorCode } from '../common/errors/app-error-codes';
import {
  DeliveryStateMachine,
  DeliveryStatus,
  TransitionActor,
} from './domain/delivery-state-machine';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { ListDeliveriesQueryDto } from './dto/list-deliveries.query.dto';
import { AuthenticatedUser } from '../auth/types/auth.types';

const OPERATION_TYPE_CREATE = 'delivery.create';

/**
 * Spec reference: Section 5 (deliveries module), Section 9 (row-scoped
 * authorization), Section 10 (state machine), Section 15 (idempotency).
 *
 * Tenant scoping is enforced in every query in this file - never trusted
 * from a client-supplied field, always derived from the authenticated
 * user (Section 8). A delivery that exists but belongs to another tenant
 * is treated identically to a delivery that doesn't exist (404), per the
 * spec's explicit guidance not to leak cross-tenant existence via a
 * different status code.
 */
@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly idempotency: IdempotencyService,
  ) {}

  async create(
    tenantId: string,
    actor: AuthenticatedUser,
    dto: CreateDeliveryDto,
    idempotencyKey: string,
  ) {
    const existing = await this.idempotency.checkExisting(
      tenantId,
      OPERATION_TYPE_CREATE,
      idempotencyKey,
    );
    if (existing) {
      return existing.responseBody;
    }

    try {
      await this.idempotency.markPending(
        tenantId,
        OPERATION_TYPE_CREATE,
        idempotencyKey,
      );
    } catch (error) {
      if (this.idempotency.isUniqueConstraintViolation(error)) {
        // Lost the race to claim this key (see IdempotencyService's
        // documented limitation) - treat identically to the PENDING case
        // checkExisting would have returned had it run a moment later.
        throw new AppException(
          AppErrorCode.CONFLICT,
          'A request with this idempotency key is already being processed.',
        );
      }
      throw error;
    }

    // Tenant-scoped existence check on the referenced customer - Section 8:
    // a client-supplied customerId belonging to another tenant must be
    // treated as not found, not as a cross-tenant reference error that
    // would confirm the id's existence elsewhere.
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, tenantId },
    });
    if (!customer) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Customer not found.');
    }

    const delivery = await this.prisma.$transaction(async (tx) => {
      const created = await tx.delivery.create({
        data: {
          tenantId,
          customerId: dto.customerId,
          createdByUserId: actor.id,
          pickupAddress: dto.pickupAddress,
          dropoffAddress: dto.dropoffAddress,
          weightKg: dto.weightKg,
          status: 'REQUESTED',
        },
      });
      // Spec Section 11: the append-only history table is written in the
      // SAME transaction as the Delivery row itself, so the two can never
      // diverge - this is the initial "creation" event, fromStatus null.
      await tx.deliveryStatusEvent.create({
        data: {
          deliveryId: created.id,
          fromStatus: null,
          toStatus: 'REQUESTED',
          changedBy: actor.id,
        },
      });
      return created;
    });

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      action: 'delivery.created',
      resourceType: 'Delivery',
      resourceId: delivery.id,
    });

    await this.idempotency.recordCompleted(
      tenantId,
      OPERATION_TYPE_CREATE,
      idempotencyKey,
      delivery,
      201,
    );

    return delivery;
  }

  async findById(tenantId: string, id: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, tenantId },
      include: { statusEvents: { orderBy: { changedAt: 'asc' } } },
    });
    if (!delivery) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Delivery not found.');
    }
    return delivery;
  }

  /**
   * Row-scoped variant used by rider-facing endpoints (status transition,
   * proof-of-delivery) - Section 9's concrete example: constrained by
   * `WHERE delivery.id = requested_id AND delivery.rider_id =
   * authenticated_user.id`, not just a role check. A rider requesting a
   * delivery assigned to someone else gets the same 404 as a nonexistent
   * delivery - existence is not confirmed to a rider who isn't assigned to it.
   */
  async findByIdForRider(tenantId: string, id: string, riderId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id, tenantId, riderId },
    });
    if (!delivery) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Delivery not found.');
    }
    return delivery;
  }

  async list(tenantId: string, query: ListDeliveriesQueryDto) {
    const limit = Math.min(Math.max(query.limit ?? 20, 1), 100);

    const deliveries = await this.prisma.delivery.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: query.status as DeliveryStatus } : {}),
        ...(query.riderId ? { riderId: query.riderId } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1, // fetch one extra to know whether a next page exists
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasNextPage = deliveries.length > limit;
    const page = hasNextPage ? deliveries.slice(0, limit) : deliveries;

    return {
      data: page,
      nextCursor: hasNextPage ? page[page.length - 1].id : null,
    };
  }

  /**
   * Generic rider-triggered status transition. Deliberately excludes
   * DELIVERED as a valid target here, even though the state machine
   * itself allows IN_TRANSIT -> DELIVERED for a RIDER actor in principle -
   * that specific transition must go through the proof-of-delivery
   * confirmation flow (spec Section 26: "a delivery must not become
   * DELIVERED merely because someone knows the delivery ID" - the intent
   * behind that guidance extends to "or merely because the assigned rider
   * tapped a generic status button," not just an anonymous caller).
   * ProofOfDeliveryService performs that specific transition itself, with
   * actor 'SYSTEM' (authorized by a validated cryptographic token, not by
   * raw role membership), after independently validating the proof.
   */
  async transition(
    tenantId: string,
    actor: AuthenticatedUser,
    deliveryId: string,
    toStatus: DeliveryStatus,
    reason?: string,
  ) {
    if (toStatus === 'DELIVERED') {
      throw new AppException(
        AppErrorCode.BUSINESS_RULE_VIOLATION,
        'Use the proof-of-delivery confirmation endpoint to mark a delivery as delivered.',
      );
    }

    const delivery = await this.findByIdForRider(
      tenantId,
      deliveryId,
      actor.id,
    );
    const transitionActor: TransitionActor = 'RIDER';

    try {
      DeliveryStateMachine.assertTransition(
        delivery.status as DeliveryStatus,
        toStatus,
        transitionActor,
      );
    } catch (error: any) {
      if (error.name === 'UnauthorizedTransitionError') {
        throw new AppException(AppErrorCode.FORBIDDEN, error.message);
      }
      throw new AppException(
        AppErrorCode.BUSINESS_RULE_VIOLATION,
        error.message,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.delivery.update({
        where: { id: delivery.id },
        data: { status: toStatus },
      });
      await tx.deliveryStatusEvent.create({
        data: {
          deliveryId: delivery.id,
          fromStatus: delivery.status,
          toStatus,
          changedBy: actor.id,
          metadata: reason ? { reason } : undefined,
        },
      });
      return result;
    });

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      action: 'delivery.status_changed',
      resourceType: 'Delivery',
      resourceId: delivery.id,
      context: { from: delivery.status, to: toStatus },
    });

    return updated;
  }

  /**
   * Retailer/admin cancellation - separate from the rider-scoped
   * transition() above because the row-scoping rule is different
   * (tenant-scoped only, not additionally constrained to a specific
   * rider) and the eligible actor differs (RETAILER/ADMIN, not RIDER).
   */
  async cancel(tenantId: string, actor: AuthenticatedUser, deliveryId: string) {
    const delivery = await this.findById(tenantId, deliveryId);
    const transitionActor: TransitionActor =
      actor.role === 'RETAILER' ? 'RETAILER' : 'ADMIN';

    try {
      DeliveryStateMachine.assertTransition(
        delivery.status as DeliveryStatus,
        'CANCELLED',
        transitionActor,
      );
    } catch (error: any) {
      if (error.name === 'UnauthorizedTransitionError') {
        throw new AppException(AppErrorCode.FORBIDDEN, error.message);
      }
      throw new AppException(
        AppErrorCode.BUSINESS_RULE_VIOLATION,
        error.message,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.delivery.update({
        where: { id: delivery.id },
        data: { status: 'CANCELLED' },
      });
      await tx.deliveryStatusEvent.create({
        data: {
          deliveryId: delivery.id,
          fromStatus: delivery.status,
          toStatus: 'CANCELLED',
          changedBy: actor.id,
        },
      });
      return result;
    });

    await this.audit.record({
      tenantId,
      actorId: actor.id,
      action: 'delivery.cancelled',
      resourceType: 'Delivery',
      resourceId: delivery.id,
    });

    return updated;
  }
}
