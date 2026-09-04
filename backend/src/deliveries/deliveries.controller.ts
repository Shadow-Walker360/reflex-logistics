import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DeliveriesService } from './deliveries.service';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { ListDeliveriesQueryDto } from './dto/list-deliveries.query.dto';
import { TransitionDeliveryStatusDto } from './dto/transition-status.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { IdempotencyKey } from '../common/decorators/idempotency-key.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

/**
 * Spec reference: Section 36 (API Design), Section 9 (row-scoped
 * authorization). No generic `PATCH /deliveries/:id` exists - state
 * changes go through explicit, named operations (create, status
 * transition, cancel) exactly as the build directive Section 2 requires,
 * so business rules can't be bypassed by editing a field directly.
 */
@ApiTags('deliveries')
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Roles('RETAILER', 'MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDeliveryDto,
    @IdempotencyKey() idempotencyKey: string,
  ) {
    return this.deliveries.create(user.tenantId, user, dto, idempotencyKey);
  }

  @Get()
  async list(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: ListDeliveriesQueryDto,
  ) {
    return this.deliveries.list(tenantId, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deliveries.findById(tenantId, id);
  }

  @Roles('RIDER')
  @Patch(':id/status')
  async transitionStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransitionDeliveryStatusDto,
  ) {
    return this.deliveries.transition(
      user.tenantId,
      user,
      id,
      dto.toStatus,
      dto.reason,
    );
  }

  @Roles('RETAILER', 'MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Patch(':id/cancel')
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.deliveries.cancel(user.tenantId, user, id);
  }
}
