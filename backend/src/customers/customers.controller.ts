import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('customers')
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Roles('RETAILER', 'MANAGER_ADMIN', 'SYSTEM_ADMIN')
  @Post()
  async create(
    @CurrentUser('tenantId') tenantId: string,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customers.create(tenantId, dto);
  }

  @Get()
  async list(@CurrentUser('tenantId') tenantId: string) {
    return this.customers.list(tenantId);
  }

  @Get(':id')
  async findOne(
    @CurrentUser('tenantId') tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customers.findById(tenantId, id);
  }
}
