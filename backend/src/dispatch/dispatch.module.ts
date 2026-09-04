import { Module } from '@nestjs/common';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import {
  DISPATCH_DB,
  DISPATCH_AUDIT,
  DISPATCH_VEHICLES,
} from './dispatch-db.token';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import { AuditModule } from '../audit/audit.module';
import { VehiclesModule } from '../vehicles/vehicles.module';

@Module({
  imports: [AuditModule, VehiclesModule],
  controllers: [DispatchController],
  providers: [
    DispatchService,
    // Binds each narrow token to the real provider instance already
    // registered elsewhere (PrismaModule is @Global; AuditService and
    // VehiclesService come from the imported modules above). See
    // dispatch-db.token.ts for why DispatchService depends on these
    // narrow interfaces rather than the concrete class types directly.
    { provide: DISPATCH_DB, useExisting: PrismaService },
    { provide: DISPATCH_AUDIT, useExisting: AuditService },
    { provide: DISPATCH_VEHICLES, useExisting: VehiclesService },
  ],
})
export class DispatchModule {}
