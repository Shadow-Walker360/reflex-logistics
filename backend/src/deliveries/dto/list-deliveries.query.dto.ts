import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Spec reference: Section 39 (Pagination/Filtering) - cursor pagination is
 * the documented default for endpoints expected to grow large and be
 * polled frequently, which the dispatcher queue (build directive Section
 * 4, "GET /deliveries paginated - cursor-based") explicitly is.
 */
export class ListDeliveriesQueryDto {
  @IsOptional()
  @IsEnum([
    'REQUESTED',
    'ASSIGNED',
    'ACCEPTED',
    'PICKED_UP',
    'IN_TRANSIT',
    'DELIVERED',
    'CANCELLED',
    'FAILED',
    'REASSIGNMENT_REQUIRED',
  ])
  status?: string;

  @IsOptional()
  @IsUUID()
  riderId?: string;

  // Opaque cursor - in practice, a Delivery id from the previous page's
  // last row. Not decoded/interpreted by the client; treated as an opaque
  // token per spec Section 39.
  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
