import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Spec reference: Section 36 (API Design), Section 15 (Idempotency).
 *
 * Cargo requirement is deliberately minimal (weightKg only) for MVP - see
 * the comment on Vehicle.capacityWeightKg in schema.prisma. customerId
 * references an existing Customer row; creating a delivery for a
 * brand-new customer is a separate "create customer" step, not folded
 * into this DTO, keeping each endpoint doing one thing.
 */
export class CreateDeliveryDto {
  @IsUUID()
  customerId!: string;

  @IsString()
  @MaxLength(500)
  pickupAddress!: string;

  @IsString()
  @MaxLength(500)
  dropoffAddress!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;
}
