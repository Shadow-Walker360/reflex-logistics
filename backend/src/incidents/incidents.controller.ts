import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

@ApiTags('incidents')
@Controller()
export class IncidentsController {
  constructor(private readonly incidents: IncidentsService) {}

  @Roles('RIDER', 'DISPATCHER', 'MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Post('deliveries/:deliveryId/incidents')
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('deliveryId', ParseUUIDPipe) deliveryId: string,
    @Body() dto: CreateIncidentDto,
  ) {
    return this.incidents.create(user.tenantId, user.id, deliveryId, dto);
  }

  @Get('deliveries/:deliveryId/incidents')
  async listForDelivery(
    @CurrentUser('tenantId') tenantId: string,
    @Param('deliveryId', ParseUUIDPipe) deliveryId: string,
  ) {
    return this.incidents.listForDelivery(tenantId, deliveryId);
  }

  @Roles('DISPATCHER', 'MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Patch('incidents/:id/resolve')
  async resolve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.incidents.resolve(user.tenantId, user.id, id);
  }
}
