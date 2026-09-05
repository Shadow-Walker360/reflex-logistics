import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenPayload, AuthenticatedUser } from '../types/auth.types';

/**
 * Verifies the access token's signature and expiry (Passport handles this
 * automatically once configured with the secret) and maps its payload onto
 * `request.user`. Deliberately does NOT hit the database on every request -
 * the access token is stateless by design (ADR-008); if a user's role
 * changes or their account is deactivated mid-token-lifetime, that takes
 * effect at most one access-token-expiry window later (spec Section 6).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('auth.accessSecret') as string,
      // Security hardening (post-Phase-2 audit): pin the accepted
      // algorithm explicitly rather than relying on passport-jwt's
      // default inference from the secret type.
      algorithms: ['HS256'],
    });
  }

  validate(payload: AccessTokenPayload): AuthenticatedUser {
    if (payload.type !== 'access') {
      // A refresh token presented where an access token is expected - the
      // refresh secret and access secret are different, so this shouldn't
      // normally verify, but the type check is a deliberate belt-and-braces
      // guard against secret reuse or future config mistakes.
      throw new UnauthorizedException();
    }
    return {
      id: payload.sub,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  }
}
