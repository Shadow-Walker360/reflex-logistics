import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('vehicles')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Roles('DISPATCHER', 'MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Post()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehicles.create(tenantId, dto);
  }

  @Get()
  async list(@CurrentUser('tenantId') tenantId: string) {
    return this.vehicles.list(tenantId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehicles.findById(tenantId, id);
  }
}
