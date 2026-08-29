import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

/**
 * Spec reference: Section 5 (users module) and Section 8 (multi-tenancy) -
 * every lookup here is explicitly tenant-scoped. There is deliberately no
 * "find user by email" method that omits tenantId - see ADR-009 for why
 * email alone is ambiguous across tenants.
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantAndEmail(
    tenantId: string,
    email: string,
  ): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  /**
   * Spec reference: Section 6 - account lockout/rate limiting.
   * Increments the failed-attempt counter and sets lockedUntil once the
   * threshold is crossed. Called by AuthService on a failed password check;
   * kept here (not inline in AuthService) since it's a User-record mutation.
   */
  async registerFailedLoginAttempt(userId: string): Promise<User> {
    const MAX_ATTEMPTS = 5;
    const LOCKOUT_MINUTES = 15;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: { increment: 1 } },
    });

    if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
      return this.prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000),
        },
      });
    }

    return user;
  }

  async clearFailedLoginAttempts(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  isLocked(user: User): boolean {
    return !!user.lockedUntil && user.lockedUntil.getTime() > Date.now();
  }
}
