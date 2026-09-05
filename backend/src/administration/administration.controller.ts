import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdministrationService } from './administration.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../auth/types/auth.types';

@ApiTags('administration')
@Controller('admin')
export class AdministrationController {
  constructor(private readonly administration: AdministrationService) {}

  @Roles('MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Post('users')
  async createUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateUserDto,
  ) {
    return this.administration.createUser(user.tenantId, user.id, dto);
  }
}
