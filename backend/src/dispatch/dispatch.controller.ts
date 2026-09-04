import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DispatchService } from './dispatch.service';
import { AssignDeliveryDto } from './dto/assign-delivery.dto';
import { RequestReassignmentDto } from './dto/request-reassignment.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

@ApiTags('dispatch')
@Controller('deliveries/:id')
export class DispatchController {
  constructor(private readonly dispatch: DispatchService) {}

  @Roles('DISPATCHER', 'MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Get('candidates')
  async getCandidates(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) deliveryId: string,
  ) {
    return this.dispatch.getCandidates(tenantId, deliveryId);
  }

  @Roles('DISPATCHER', 'MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Patch('assign')
  async assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) deliveryId: string,
    @Body() dto: AssignDeliveryDto,
  ) {
    return this.dispatch.assign(
      user.tenantId,
      user.id,
      deliveryId,
      dto.riderId,
      dto.vehicleId,
    );
  }

  @Roles('DISPATCHER', 'MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Patch('request-reassignment')
  async requestReassignment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) deliveryId: string,
    @Body() dto: RequestReassignmentDto,
  ) {
    return this.dispatch.requestReassignment(
      user.tenantId,
      user.id,
      deliveryId,
      dto.reason,
    );
  }
}
