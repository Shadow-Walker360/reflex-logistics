import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { AppErrorCode } from '../common/errors/app-error-codes';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { isVehicleEligible } from './vehicle-eligibility';

/**
 * Spec reference: Section 5 (vehicles module), Section 19 (vehicle/cargo
 * logic). Eligibility check kept here (not duplicated in DispatchService)
 * since "does this vehicle satisfy this cargo requirement" is a property
 * of the vehicle, not a dispatch-specific concern - DispatchService calls
 * this rather than re-implementing the comparison.
 */
@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateVehicleDto) {
    return this.prisma.vehicle.create({
      data: {
        tenantId,
        type: dto.type,
        capacityWeightKg: dto.capacityWeightKg,
        riderId: dto.riderId,
      },
    });
  }

  async list(tenantId: string) {
    return this.prisma.vehicle.findMany({
      where: { tenantId, isActive: true },
    });
  }

  async findById(tenantId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id, tenantId },
    });
    if (!vehicle) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Vehicle not found.');
    }
    return vehicle;
  }

  /**
   * Spec Section 19: eligibility, not ranking - "Vehicle must support
   * cargo requirements" is a hard yes/no filter. Delegates to the
   * standalone isVehicleEligible function (vehicle-eligibility.ts) so the
   * actual comparison logic is unit-testable independent of Prisma.
   */
  isEligible(
    vehicle: { capacityWeightKg: number },
    requiredWeightKg: number | null | undefined,
  ): boolean {
    return isVehicleEligible(vehicle, requiredWeightKg);
  }
}
