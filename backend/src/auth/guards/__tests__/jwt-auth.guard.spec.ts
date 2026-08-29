import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../jwt-auth.guard';

function makeContext(): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('bypasses authentication entirely when the route is marked @Public()', () => {
    const reflector = { getAllAndOverride: () => true } as unknown as Reflector;
    const guard = new JwtAuthGuard(reflector);

    const result = guard.canActivate(makeContext());

    // No Passport strategy is invoked at all for a public route - if this
    // returned anything other than the literal `true` short-circuit, it
    // would mean super.canActivate() (real JWT verification) ran, which
    // requires a full HTTP request/response and would throw synchronously
    // in this minimal fake context. The test passing without throwing is
    // itself evidence the short-circuit fired before delegating to Passport.
    expect(result).toBe(true);
  });

  // Note: the non-public path (delegating to Passport's 'jwt' strategy) is
  // intentionally NOT unit-tested here - AuthGuard('jwt') is a framework
  // mixin that expects a real HTTP request/response pair to run the
  // strategy against, which makes it an integration/e2e concern rather
  // than a pure-logic one. It is exercised by test/health.e2e-spec.ts's
  // sibling auth e2e suite once one exists (tracked in progress.md), and
  // ultimately by every protected endpoint's own e2e tests as those are
  // built in later phases.
});
