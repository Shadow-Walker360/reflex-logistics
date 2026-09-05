import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';

/**
 * Spec reference: Section 15 (Idempotency) - "Idempotency-Key: abc123".
 * Required (not optional) on endpoints that use it - a create-delivery
 * request with no idempotency key is rejected outright rather than
 * silently proceeding without duplicate protection.
 */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const key = request.headers['idempotency-key'];
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      throw new BadRequestException('Idempotency-Key header is required.');
    }
    if (key.length > 200) {
      throw new BadRequestException('Idempotency-Key header is too long.');
    }
    return key;
  },
);
