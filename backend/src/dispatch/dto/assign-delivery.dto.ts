import { IsUUID } from 'class-validator';

export class AssignDeliveryDto {
  @IsUUID()
  riderId!: string;

  @IsUUID()
  vehicleId!: string;
}
