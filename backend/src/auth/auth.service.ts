import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../database/prisma.service';
import { UsersService } from '../users/users.service';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { AppErrorCode } from '../common/errors/app-error-codes';

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
}

/**
 * Spec reference: Section 6 (Authentication).
 *
 * Orchestrates login/refresh/logout. Deliberately thin: password hashing
 * lives in PasswordService, JWT mechanics live in TokenService, lockout
 * bookkeeping lives in UsersService - this class only sequences them and
 * enforces the "never reveal which part of the check failed" rule.
 */
@Injectable()
export class AuthService {
  /**
   * Security fix (post-Phase-2 audit): a valid-looking bcrypt hash with no
   * corresponding real password, used to run a dummy comparison on every
   * path that leads to INVALID_CREDENTIALS but does NOT already involve a
   * real bcrypt call (nonexistent tenant, nonexistent/inactive user).
   *
   * Without this, those paths return in a few milliseconds while the
   * "wrong password" path takes ~250-600ms (real bcrypt cost-12 compare),
   * making the three cases distinguishable by response time alone despite
   * returning an identical error code and message. That's a timing side
   * channel that defeats the exact guarantee the surrounding code comments
   * claim to provide ("never reveal which check failed") - an attacker
   * measuring response latency could still enumerate valid tenant slugs
   * and email addresses. This constant equalizes the cost of every
   * INVALID_CREDENTIALS path. It is NOT applied to the account-locked path,
   * since that path already returns a different, intentionally distinct
   * status/message (403 FORBIDDEN) - there is no additional information to
   * protect by equalizing its timing too.
   */
  private static readonly DUMMY_HASH =
    '$2b$12$CwTycUXWue0Thq9StjUM0uJ8T6b5YhqhztjTeMKVKKlfyO2eGCVUu';

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async login(
    tenantSlug: string,
    email: string,
    password: string,
    context: { ip?: string } = {},
  ): Promise<LoginResult> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });

    // Deliberately generic failure for "no such tenant", "no such user in
    // that tenant", AND "wrong password" - spec Section 6: "Authentication
    // failures return a generic 401 - never 'user not found' vs 'wrong
    // password', which leaks account existence." A nonexistent tenant slug
    // is treated the same way for the same reason (avoids confirming/denying
    // tenant existence to an unauthenticated caller).
    if (!tenant || !tenant.isActive) {
      await this.passwords.verify(password, AuthService.DUMMY_HASH); // timing equalization - see DUMMY_HASH doc comment
      await this.audit.record({
        tenantId: tenant?.id,
        action: 'auth.login_failed',
        resourceType: 'Tenant',
        context: {
          reason: 'tenant_not_found_or_inactive',
          tenantSlug,
          ip: context.ip,
        },
      });
      throw new AppException(
        AppErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials.',
      );
    }

    const user = await this.users.findByTenantAndEmail(tenant.id, email);
    if (!user || !user.isActive) {
      await this.passwords.verify(password, AuthService.DUMMY_HASH); // timing equalization
      await this.audit.record({
        tenantId: tenant.id,
        action: 'auth.login_failed',
        resourceType: 'User',
        context: {
          reason: 'user_not_found_or_inactive',
          email,
          ip: context.ip,
        },
      });
      throw new AppException(
        AppErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials.',
      );
    }

    // Section 6: account lockout is checked BEFORE the password comparison
    // is attempted, so a locked account doesn't leak timing information via
    // bcrypt's comparison cost (see ADR-008, Security consequences).
    if (this.users.isLocked(user)) {
      await this.audit.record({
        tenantId: tenant.id,
        actorId: user.id,
        action: 'auth.login_failed',
        resourceType: 'User',
        resourceId: user.id,
        context: { reason: 'account_locked', ip: context.ip },
      });
      throw new AppException(
        AppErrorCode.FORBIDDEN,
        'This account is temporarily locked due to repeated failed login attempts. Please try again later.',
      );
    }

    const passwordValid = await this.passwords.verify(
      password,
      user.passwordHash,
    );
    if (!passwordValid) {
      await this.users.registerFailedLoginAttempt(user.id);
      await this.audit.record({
        tenantId: tenant.id,
        actorId: user.id,
        action: 'auth.login_failed',
        resourceType: 'User',
        resourceId: user.id,
        context: { reason: 'wrong_password', ip: context.ip },
      });
      throw new AppException(
        AppErrorCode.INVALID_CREDENTIALS,
        'Invalid credentials.',
      );
    }

    await this.users.clearFailedLoginAttempts(user.id);

    const pair = await this.tokens.issueTokenPair(
      user.id,
      tenant.id,
      user.role,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.tokens.hashRefreshToken(pair.refreshToken),
        expiresAt: pair.refreshTokenExpiresAt,
      },
    });

    await this.audit.record({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'auth.login_succeeded',
      resourceType: 'User',
      resourceId: user.id,
      context: { ip: context.ip },
    });

    return { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
  }

  async refresh(refreshToken: string): Promise<LoginResult> {
    let payload;
    try {
      payload = await this.tokens.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppException(
        AppErrorCode.AUTHENTICATION_REQUIRED,
        'Invalid or expired refresh token.',
      );
    }

    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    // Section 6: refresh tokens are DB-backed specifically so they're
    // revocable. A token that verifies cryptographically but has no
    // matching (or has a revoked) DB row is treated as invalid - this is
    // what makes logout/compromise-response actually work despite using
    // JWTs for the refresh token itself.
    if (
      !stored ||
      stored.revokedAt ||
      stored.expiresAt.getTime() < Date.now()
    ) {
      throw new AppException(
        AppErrorCode.AUTHENTICATION_REQUIRED,
        'Invalid or expired refresh token.',
      );
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new AppException(
        AppErrorCode.AUTHENTICATION_REQUIRED,
        'Invalid or expired refresh token.',
      );
    }

    // Rotation: the old refresh token is revoked and a new pair is issued,
    // rather than reusing the same refresh token indefinitely. Limits the
    // window a stolen-but-not-yet-used refresh token remains valid.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const pair = await this.tokens.issueTokenPair(
      user.id,
      user.tenantId,
      user.role,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.tokens.hashRefreshToken(pair.refreshToken),
        expiresAt: pair.refreshTokenExpiresAt,
      },
    });

    return { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    // Best-effort: an already-invalid/unknown token is a no-op, not an
    // error - logging out is idempotent from the caller's perspective.
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Spec deviation, recorded in ADR-012: self-service organization signup,
   * overriding the original spec's "admin-created accounts only" MVP
   * scope. Creates a brand-new Tenant AND its first User (MANAGER_ADMIN
   * for that tenant) in a single transaction - this is "a new
   * organization joins Reflex," not "invite a teammate to an existing
   * organization" (which would need an invitation-token flow and is not
   * built).
   *
   * Terms-and-conditions acceptance is enforced at the DTO layer
   * (SignupDto's @MustBeTrue()) before this method is ever called, but the
   * acceptance record (timestamp + version) is written here, as part of
   * the same transaction that creates the account - so it's never
   * possible for a User row to exist without a corresponding terms
   * acceptance record.
   */
  async signup(
    organizationName: string,
    tenantSlug: string,
    email: string,
    password: string,
    context: { ip?: string } = {},
  ): Promise<LoginResult> {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: tenantSlug },
    });
    if (existingTenant) {
      // Unlike login's deliberately-generic-across-failure-reasons
      // approach (Section 6), signup's tenantSlug collision is NOT a
      // security-sensitive existence check to hide - the whole point of
      // choosing a slug is picking one that isn't taken yet, the same as
      // any username/handle-picking flow. A generic message here would
      // just make the signup form unusable.
      throw new AppException(
        AppErrorCode.CONFLICT,
        'This organization identifier is already taken. Please choose a different one.',
      );
    }

    const passwordHash = await this.passwords.hash(password);
    const termsVersion = this.config.get<string>('legal.currentTermsVersion');

    let tenant, user;
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: { name: organizationName, slug: tenantSlug },
        });
        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email,
            passwordHash,
            role: 'MANAGER_ADMIN',
            termsAcceptedAt: new Date(),
            termsVersion,
          },
        });
        return { tenant, user };
      });
      tenant = result.tenant;
      user = result.user;
    } catch (error: any) {
      // Race condition, not just a pre-check gap: two concurrent signups
      // could both pass the findUnique check above (slug not yet taken)
      // before either transaction commits. The database's unique
      // constraint on Tenant.slug is the real guarantee here (the
      // findUnique check above is only a fast-path UX improvement to
      // avoid an unnecessary bcrypt hash + transaction attempt in the
      // common case) - Prisma's P2002 error code on that constraint is
      // caught here and converted to the same 409 a pre-check failure
      // would produce, rather than surfacing as an unhandled 500.
      if (error?.code === 'P2002') {
        throw new AppException(
          AppErrorCode.CONFLICT,
          'This organization identifier is already taken. Please choose a different one.',
        );
      }
      throw error;
    }

    const pair = await this.tokens.issueTokenPair(
      user.id,
      tenant.id,
      user.role,
    );
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.tokens.hashRefreshToken(pair.refreshToken),
        expiresAt: pair.refreshTokenExpiresAt,
      },
    });

    await this.audit.record({
      tenantId: tenant.id,
      actorId: user.id,
      action: 'auth.signup_succeeded',
      resourceType: 'Tenant',
      resourceId: tenant.id,
      context: { email, tenantSlug, termsVersion, ip: context.ip },
    });

    return { accessToken: pair.accessToken, refreshToken: pair.refreshToken };
  }
}
