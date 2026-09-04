import { Module } from '@nestjs/common';
import { RidersController } from './riders.controller';
import { RidersService } from './riders.service';

@Module({
  controllers: [RidersController],
  providers: [RidersService],
  exports: [RidersService],
})
export class RidersModule {}
