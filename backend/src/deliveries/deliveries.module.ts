import { Module } from '@nestjs/common';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesService } from './deliveries.service';
import { ProofOfDeliveryController } from './proof-of-delivery/proof-of-delivery.controller';
import { ProofOfDeliveryService } from './proof-of-delivery/proof-of-delivery.service';
import { AuditModule } from '../audit/audit.module';
import { IdempotencyModule } from '../common/idempotency/idempotency.module';

@Module({
  imports: [AuditModule, IdempotencyModule],
  controllers: [DeliveriesController, ProofOfDeliveryController],
  providers: [DeliveriesService, ProofOfDeliveryService],
  exports: [DeliveriesService, ProofOfDeliveryService],
})
export class DeliveriesModule {}
