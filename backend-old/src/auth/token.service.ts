import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID, createHash } from 'crypto';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  RoleName,
} from './types/auth.types';

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenId: string; // jti - the caller persists a hash of this
  refreshTokenExpiresAt: Date;
}

/**
 * Spec reference: Section 6 (Authentication), ADR-008.
 *
 * Owns JWT signing/verification only - no database access, no business
 * logic about lockout or credential validity. Kept separate from
 * AuthService so token mechanics are independently testable without
 * mocking Prisma.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async issueTokenPair(
    userId: string,
    tenantId: string,
    role: RoleName,
  ): Promise<IssuedTokenPair> {
    const accessPayload: AccessTokenPayload = {
      sub: userId,
      tenantId,
      role,
      type: 'access',
    };
    const accessExpiresIn = this.config.get<string>(
      'auth.accessExpiresIn',
    ) as string;
    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get<string>('auth.accessSecret'),
      // Security hardening (post-Phase-2 audit): pin the signing algorithm
      // explicitly rather than relying on the library default. Defends
      // against algorithm-confusion class bugs (e.g. a future change that
      // introduces an asymmetric key elsewhere in the app being usable as
      // an HMAC secret) even though, as currently written, only symmetric
      // HMAC secrets are ever used.
      algorithm: 'HS256',
      // `expiresIn` accepts a duration string ("15m", "7d") at runtime -
      // @nestjs/jwt's TS types are narrower (`StringValue` from `ms`) than
      // the plain `string` our validated env config produces, so this is
      // cast rather than re-typed throughout config.ts; env.validation.ts
      // (Joi) is what actually guarantees this is a well-formed duration.
      expiresIn: accessExpiresIn as unknown as number,
    });

    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = {
      sub: userId,
      tenantId,
      type: 'refresh',
      jti,
    };
    const refreshExpiresIn = this.config.get<string>(
      'auth.refreshExpiresIn',
    ) as string;
    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.get<string>('auth.refreshSecret'),
      algorithm: 'HS256',
      expiresIn: refreshExpiresIn as unknown as number,
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenId: jti,
      refreshTokenExpiresAt: addDuration(new Date(), refreshExpiresIn),
    };
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwt.verifyAsync<AccessTokenPayload>(token, {
      secret: this.config.get<string>('auth.accessSecret'),
      algorithms: ['HS256'],
    });
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
    return this.jwt.verifyAsync<RefreshTokenPayload>(token, {
      secret: this.config.get<string>('auth.refreshSecret'),
      algorithms: ['HS256'],
    });
  }

  /**
   * Spec reference: Section 6 - "the token value itself is never stored,
   * only its hash". A refresh token is a bearer credential; storing it in
   * plaintext would mean a database read alone yields a usable token.
   * SHA-256 (not bcrypt) is deliberate here: this hash is looked up by
   * exact-match equality (an index lookup), not compared against a
   * low-entropy human-chosen secret, so bcrypt's slow, salted comparison
   * is unnecessary overhead - the token itself already has high entropy.
   */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}

/**
 * Minimal duration parser for the small set of formats @nestjs/jwt's
 * `expiresIn` accepts that we actually use ("15m", "7d", etc.) - just
 * enough to compute the DB-stored expiry timestamp without pulling in a
 * full duration-parsing dependency for one call site.
 */
function addDuration(base: Date, duration: string): Date {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Unsupported duration format: "${duration}"`);
  }
  const amount = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(base.getTime() + amount * multipliers[unit]);
}
