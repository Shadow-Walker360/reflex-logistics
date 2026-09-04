import { IsEnum, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

const VEHICLE_TYPES = [
  'MOTORCYCLE',
  'CAR',
  'VAN',
  'PICKUP',
  'TRUCK',
  'LORRY',
] as const;

export class CreateVehicleDto {
  @IsEnum(VEHICLE_TYPES)
  type!: (typeof VEHICLE_TYPES)[number];

  @IsNumber()
  @Min(0)
  capacityWeightKg!: number;

  @IsOptional()
  @IsUUID()
  riderId?: string;
}
