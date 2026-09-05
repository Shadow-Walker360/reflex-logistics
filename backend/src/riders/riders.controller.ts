import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RidersService } from './riders.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SetAvailabilityDto } from './dto/set-availability.dto';

@ApiTags('riders')
@Controller('riders')
export class RidersController {
  constructor(private readonly riders: RidersService) {}

  @Roles('DISPATCHER', 'MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Get()
  async list(@CurrentUser('tenantId') tenantId: string) {
    return this.riders.list(tenantId);
  }

  @Roles('DISPATCHER', 'MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Get('available')
  async listAvailable(@CurrentUser('tenantId') tenantId: string) {
    return this.riders.listAvailable(tenantId);
  }

  // A rider may update their OWN availability (row-scoped in the service
  // layer via findById + tenant match; further restricted to "self" here
  // since nothing about role alone proves it's the rider's own record -
  // see the comment on the service call site).
  @Roles('RIDER')
  @Patch(':id/availability')
  async setAvailability(
    @CurrentUser() user: { id: string; tenantId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAvailabilityDto,
  ) {
    return this.riders.setOwnAvailability(
      user.tenantId,
      user.id,
      id,
      dto.isAvailable,
    );
  }
}
