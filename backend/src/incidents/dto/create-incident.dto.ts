import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

const INCIDENT_TYPES = [
  'VEHICLE_BREAKDOWN',
  'RIDER_UNAVAILABLE',
  'ACCIDENT',
  'ROAD_BLOCKAGE',
  'CUSTOMER_UNREACHABLE',
  'WRONG_ADDRESS',
  'DAMAGED_GOODS',
  'OTHER',
] as const;

export class CreateIncidentDto {
  @IsEnum(INCIDENT_TYPES)
  type!: (typeof INCIDENT_TYPES)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  description!: string;
}
