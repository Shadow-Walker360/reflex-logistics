import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../roles.guard';
import { AuthenticatedUser } from '../../types/auth.types';

function makeContext(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  it('allows access when the route declares no required roles', () => {
    const reflector = {
      getAllAndOverride: () => undefined,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = makeContext({ id: 'u1', tenantId: 't1', role: 'RIDER' });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when the user has one of the required roles', () => {
    const reflector = {
      getAllAndOverride: () => ['DISPATCHER', 'MANAGER_ADMIN'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = makeContext({
      id: 'u1',
      tenantId: 't1',
      role: 'DISPATCHER',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the user does not have a required role', () => {
    const reflector = {
      getAllAndOverride: () => ['DISPATCHER', 'MANAGER_ADMIN'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = makeContext({ id: 'u1', tenantId: 't1', role: 'RIDER' });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies access when there is no authenticated user on the request', () => {
    const reflector = {
      getAllAndOverride: () => ['DISPATCHER'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = makeContext(undefined);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies a RIDER attempting a MANAGER_ADMIN-only route (spec Section 7 example)', () => {
    const reflector = {
      getAllAndOverride: () => ['MANAGER_ADMIN', 'SYSTEM_ADMIN'],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    const context = makeContext({
      id: 'rider-1',
      tenantId: 't1',
      role: 'RIDER',
    });

    expect(guard.canActivate(context)).toBe(false);
  });
});
