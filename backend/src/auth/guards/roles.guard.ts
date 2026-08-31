import { ExecutionContext, Injectable } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthenticatedUser } from '../types/auth.types';

/**
 * Spec reference: Section 7 (Authorization / RBAC).
 *
 * Runs AFTER JwtAuthGuard (see AuthModule provider order) so
 * `request.user` is already populated from a verified token. A route with
 * no @Roles() decorator is allowed for any authenticated user - role
 * restriction is opt-in per route, same as authentication is opt-out per
 * route (@Public). This guard alone is NOT sufficient for row-scoped
 * authorization (Section 9) - e.g. "a rider may update their OWN assigned
 * delivery" needs an additional check in the service/repository layer
 * comparing the resource's owning id against request.user.id, which this
 * guard has no visibility into. Built when the corresponding domain
 * module (Phase 3+) needs it.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser | undefined = request.user;

    if (!user) {
      return false;
    }

    return requiredRoles.includes(user.role);
  }
}
