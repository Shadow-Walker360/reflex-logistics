import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AppException } from '../../common/errors/app.exception';
import { AppErrorCode } from '../../common/errors/app-error-codes';
import { DeliveryStateMachine } from '../domain/delivery-state-machine';
import {
  generateProofToken,
  hashProofToken,
  computeProofTokenExpiry,
  isProofTokenExpired,
  hashesMatch,
} from './proof-token';

/**
 * Spec reference: Section 26 (Proof of Delivery).
 *
 * "A delivery must not become DELIVERED merely because someone knows the
 * delivery ID" - this is the ONLY path by which a delivery may reach
 * DELIVERED (DeliveriesService.transition explicitly rejects that target
 * status and points here instead).
 */
@Injectable()
export class ProofOfDeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Row-scoped to the assigned rider (spec Section 9) - only the rider
   * actually assigned to this delivery can request a proof token for it.
   * Requires the delivery to be IN_TRANSIT - requesting a token for a
   * delivery that hasn't been picked up yet, or that's already delivered,
   * makes no sense and is rejected.
   */
  async requestToken(
    tenantId: string,
    riderId: string,
    deliveryId: string,
  ): Promise<string> {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId, riderId },
    });
    if (!delivery) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Delivery not found.');
    }
    if (delivery.status !== 'IN_TRANSIT') {
      throw new AppException(
        AppErrorCode.BUSINESS_RULE_VIOLATION,
        'A proof-of-delivery token can only be requested while the delivery is IN_TRANSIT.',
      );
    }

    const token = generateProofToken();
    await this.prisma.delivery.update({
      where: { id: delivery.id },
      data: {
        proofTokenHash: hashProofToken(token),
        proofTokenExpiresAt: computeProofTokenExpiry(),
        proofConfirmedAt: null,
      },
    });

    await this.audit.record({
      tenantId,
      actorId: riderId,
      action: 'delivery.proof_token_requested',
      resourceType: 'Delivery',
      resourceId: delivery.id,
    });

    // The raw token is returned exactly once, here, and never persisted -
    // the caller (rider app) displays it as a QR code / reads it aloud as
    // an OTP for the customer to confirm. It cannot be recovered from the
    // database afterward, only re-issued (which invalidates the old one,
    // since requesting again overwrites proofTokenHash).
    return token;
  }

  /**
   * Row-scoped the same way as requestToken. Validates the presented
   * token against the stored hash (constant-time comparison, spec Section
   * 26 threat: replay/guessing attacks), checks expiry, and enforces
   * single-use by clearing proofTokenHash on success - a second
   * presentation of the same token, even before expiry, finds no stored
   * hash to match against and is rejected.
   */
  async confirmToken(
    tenantId: string,
    riderId: string,
    deliveryId: string,
    presentedToken: string,
  ) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId, riderId },
    });
    if (!delivery) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Delivery not found.');
    }
    if (!delivery.proofTokenHash || !delivery.proofTokenExpiresAt) {
      throw new AppException(
        AppErrorCode.BUSINESS_RULE_VIOLATION,
        'No proof-of-delivery token has been requested for this delivery.',
      );
    }
    if (isProofTokenExpired(delivery.proofTokenExpiresAt)) {
      throw new AppException(
        AppErrorCode.BUSINESS_RULE_VIOLATION,
        'This proof-of-delivery token has expired. Request a new one.',
      );
    }
    if (!hashesMatch(hashProofToken(presentedToken), delivery.proofTokenHash)) {
      await this.audit.record({
        tenantId,
        actorId: riderId,
        action: 'delivery.proof_token_confirm_failed',
        resourceType: 'Delivery',
        resourceId: delivery.id,
        context: { reason: 'token_mismatch' },
      });
      throw new AppException(
        AppErrorCode.BUSINESS_RULE_VIOLATION,
        'Invalid proof-of-delivery token.',
      );
    }

    // Authorization for this specific transition comes from the validated
    // token, not from raw RIDER role membership - actor is 'SYSTEM' here
    // deliberately (see DeliveriesService.transition's comment on why the
    // generic status endpoint excludes DELIVERED as a target).
    DeliveryStateMachine.assertTransition(
      delivery.status as any,
      'DELIVERED',
      'SYSTEM',
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.delivery.update({
        where: { id: delivery.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          proofConfirmedAt: new Date(),
          proofTokenHash: null, // single-use: cleared so it cannot be replayed
          proofTokenExpiresAt: null,
        },
      });
      await tx.deliveryStatusEvent.create({
        data: {
          deliveryId: delivery.id,
          fromStatus: delivery.status,
          toStatus: 'DELIVERED',
          changedBy: riderId,
          metadata: { via: 'proof_of_delivery' },
        },
      });
      return result;
    });

    await this.audit.record({
      tenantId,
      actorId: riderId,
      action: 'delivery.proof_confirmed',
      resourceType: 'Delivery',
      resourceId: delivery.id,
    });

    return updated;
  }
}
