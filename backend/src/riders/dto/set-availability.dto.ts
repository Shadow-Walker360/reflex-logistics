import { IsBoolean } from 'class-validator';

export class SetAvailabilityDto {
  @IsBoolean()
  isAvailable!: boolean;
}
