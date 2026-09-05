import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { AppErrorCode } from '../common/errors/app-error-codes';

/**
 * Spec reference: Section 5 (riders module). No rider-creation endpoint
 * here - a Rider row is created by promoting an existing User (role
 * RIDER) via administration (not yet built, same gap class as the
 * user-creation gap Phase 2 flagged - tracked in progress.md). For now,
 * Rider rows exist only via direct DB/seed insertion, same workaround
 * documented for Users in Phase 2.
 */
@Injectable()
export class RidersService {
  constructor(private readonly prisma: PrismaService) {}

  async listAvailable(tenantId: string) {
    return this.prisma.rider.findMany({
      where: { tenantId, isAvailable: true },
      include: { user: { select: { id: true, email: true } }, vehicles: true },
    });
  }

  async list(tenantId: string) {
    return this.prisma.rider.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, email: true } } },
    });
  }

  async findById(tenantId: string, id: string) {
    const rider = await this.prisma.rider.findFirst({
      where: { id, tenantId },
    });
    if (!rider) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Rider not found.');
    }
    return rider;
  }

  async setAvailability(
    tenantId: string,
    riderId: string,
    isAvailable: boolean,
  ) {
    const rider = await this.findById(tenantId, riderId);
    return this.prisma.rider.update({
      where: { id: rider.id },
      data: { isAvailable },
    });
  }

  /**
   * Row-scoped variant for the rider-facing endpoint (spec Section 9): a
   * rider may only change availability on the Rider row that belongs to
   * their OWN user account, not any rider id in the tenant. Matched on
   * `userId = authenticatedUserId`, the same IDOR-prevention pattern used
   * throughout DeliveriesService - "not found" (404) is returned for a
   * mismatched rider id, not 403, so a rider can't distinguish "that
   * rider id exists but isn't yours" from "that rider id doesn't exist."
   */
  async setOwnAvailability(
    tenantId: string,
    authenticatedUserId: string,
    riderId: string,
    isAvailable: boolean,
  ) {
    const rider = await this.prisma.rider.findFirst({
      where: { id: riderId, tenantId, userId: authenticatedUserId },
    });
    if (!rider) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Rider not found.');
    }
    return this.prisma.rider.update({
      where: { id: rider.id },
      data: { isAvailable },
    });
  }
}
