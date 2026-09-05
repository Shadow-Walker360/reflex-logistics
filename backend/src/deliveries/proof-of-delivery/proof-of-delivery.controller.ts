import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ProofOfDeliveryService } from './proof-of-delivery.service';
import { ConfirmProofOfDeliveryDto } from './dto/confirm-proof.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AuthenticatedUser } from '../../auth/types/auth.types';

@ApiTags('proof-of-delivery')
@Controller('deliveries/:id/proof-of-delivery')
export class ProofOfDeliveryController {
  constructor(private readonly proofOfDelivery: ProofOfDeliveryService) {}

  @Roles('RIDER')
  @Post('request')
  async requestToken(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) deliveryId: string,
  ) {
    const token = await this.proofOfDelivery.requestToken(
      user.tenantId,
      user.id,
      deliveryId,
    );
    // Returned once, directly to the rider's own authenticated request -
    // never logged, never stored raw (see proof-of-delivery.service.ts).
    return { token };
  }

  @Roles('RIDER')
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  async confirm(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) deliveryId: string,
    @Body() dto: ConfirmProofOfDeliveryDto,
  ) {
    return this.proofOfDelivery.confirmToken(
      user.tenantId,
      user.id,
      deliveryId,
      dto.token,
    );
  }
}
