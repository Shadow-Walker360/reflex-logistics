import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { AppErrorCode } from '../common/errors/app-error-codes';
import { CreateIncidentDto } from './dto/create-incident.dto';

/**
 * Spec reference: Section 23 (Incident Management). Any authenticated
 * tenant member (rider or dispatcher, enforced at the controller) may
 * report an incident against a delivery in their own tenant - tenant
 * scoping applies, row-scoping to "your own delivery" deliberately does
 * NOT, since a dispatcher reporting an incident on any tenant delivery is
 * legitimate, unlike a rider updating another rider's delivery status.
 */
@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(
    tenantId: string,
    reportedById: string,
    deliveryId: string,
    dto: CreateIncidentDto,
  ) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, tenantId },
    });
    if (!delivery) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Delivery not found.');
    }

    const incident = await this.prisma.incident.create({
      data: {
        tenantId,
        deliveryId,
        reportedById,
        type: dto.type,
        description: dto.description,
        status: 'OPEN',
      },
    });

    await this.audit.record({
      tenantId,
      actorId: reportedById,
      action: 'incident.reported',
      resourceType: 'Incident',
      resourceId: incident.id,
      context: { deliveryId, type: dto.type },
    });

    return incident;
  }

  async resolve(tenantId: string, actorId: string, incidentId: string) {
    const incident = await this.prisma.incident.findFirst({
      where: { id: incidentId, tenantId },
    });
    if (!incident) {
      throw new AppException(AppErrorCode.NOT_FOUND, 'Incident not found.');
    }
    if (incident.status === 'RESOLVED') {
      throw new AppException(
        AppErrorCode.BUSINESS_RULE_VIOLATION,
        'This incident is already resolved.',
      );
    }

    const updated = await this.prisma.incident.update({
      where: { id: incident.id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });

    await this.audit.record({
      tenantId,
      actorId,
      action: 'incident.resolved',
      resourceType: 'Incident',
      resourceId: incident.id,
    });

    return updated;
  }

  async listForDelivery(tenantId: string, deliveryId: string) {
    return this.prisma.incident.findMany({
      where: { tenantId, deliveryId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
