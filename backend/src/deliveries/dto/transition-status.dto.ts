import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Deliberately excludes 'DELIVERED' from the allowed set (see
 * DeliveriesService.transition's comment) and excludes 'REQUESTED' (no
 * transition ever targets it - it's the initial state only) and
 * 'REASSIGNMENT_REQUIRED'/'ASSIGNED' (dispatcher/system-triggered, not
 * something a rider requests via this endpoint).
 */
const RIDER_TRANSITIONABLE_STATUSES = [
  'ACCEPTED',
  'PICKED_UP',
  'IN_TRANSIT',
  'FAILED',
] as const;

export class TransitionDeliveryStatusDto {
  @IsIn(RIDER_TRANSITIONABLE_STATUSES)
  toStatus!: (typeof RIDER_TRANSITIONABLE_STATUSES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
