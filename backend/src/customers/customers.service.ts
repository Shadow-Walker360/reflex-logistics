import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AppException } from '../common/errors/app.exception';
import { AppErrorCode } from '../common/errors/app-error-codes';
import { CreateCustomerDto } from './dto/create-customer.dto';

/**
 * Spec reference: Section 5 (customers module) - "Customer-specific
 * profile data," minimal for MVP. No update/delete endpoints yet (not
 * needed for the P0-C critical path: create a customer, then create a
 * delivery for them).
 */
@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        tenantId,
        name: dto.name,
        phoneNumber: dto.phoneNumber,
        address: dto.address,
      },
    });
  }

  async list(tenantId: string) {
    return this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async findById(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Customer not found.');
    }
    return customer;
  }
}
