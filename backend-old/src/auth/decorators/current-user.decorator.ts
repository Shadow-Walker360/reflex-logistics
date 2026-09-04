import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../types/auth.types';

/**
 * Spec reference: Section 8 - tenant/identity context must come from the
 * authenticated session, never from client-supplied fields. Controllers
 * use `@CurrentUser() user: AuthenticatedUser` to read the verified
 * identity that JwtAuthGuard attached to the request - never
 * `req.body.userId` or `req.body.tenantId`.
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;
    return data ? user?.[data] : user;
  },
);
