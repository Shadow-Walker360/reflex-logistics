import { Module } from '@nestjs/common';
import { AdministrationController } from './administration.controller';
import { AdministrationService } from './administration.service';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [AdministrationController],
  providers: [AdministrationService],
})
export class AdministrationModule {}
