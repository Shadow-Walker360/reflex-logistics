import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { PasswordService } from '../auth/password.service';
import { AuditService } from '../audit/audit.service';
import { AppException } from '../common/errors/app.exception';
import { AppErrorCode } from '../common/errors/app-error-codes';
import { CreateUserDto } from './dto/create-user.dto';
import { isAssignableRole } from './role-assignment';

/**
 * Spec reference: Section 5 (administration module).
 *
 * Closes the remaining piece of the "no way to create users" gap that
 * ADR-012's signup endpoint only partly addressed - signup creates a
 * tenant's FIRST user; this creates every subsequent one, scoped to the
 * calling admin's own tenant (never a client-supplied tenantId - Section
 * 8, same pattern as every other tenant-scoped write in this codebase).
 */
@Injectable()
export class AdministrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  async createUser(tenantId: string, actorUserId: string, dto: CreateUserDto) {
    // Belt-and-braces (defense in depth, same principle as Section 8's
    // three-layer tenant isolation): CreateUserDto's @IsIn already
    // restricts `role` to the assignable set at the validation layer, but
    // this second check protects against a future DTO change accidentally
    // widening that set without updating this service to match.
    if (!isAssignableRole(dto.role)) {
      throw new AppException(
        AppErrorCode.FORBIDDEN,
        'This role cannot be assigned through this endpoint.',
      );
    }

    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) {
      throw new AppException(
        AppErrorCode.CONFLICT,
        'A user with this email already exists in your organization.',
      );
    }

    const passwordHash = await this.passwords.hash(dto.password);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenantId,
          email: dto.email,
          passwordHash,
          role: dto.role,
        },
      });

      // A User with role RIDER needs a corresponding Rider profile to be
      // usable anywhere in the dispatch/delivery flow (RidersService,
      // DispatchService both query the Rider table, not User directly) -
      // created here, in the same transaction, so it's never possible for
      // a RIDER-role User to exist without one.
      if (dto.role === 'RIDER') {
        await tx.rider.create({
          data: { tenantId, userId: created.id, isAvailable: true },
        });
      }

      return created;
    });

    await this.audit.record({
      tenantId,
      actorId: actorUserId,
      action: 'user.created',
      resourceType: 'User',
      resourceId: user.id,
      context: { email: dto.email, role: dto.role },
    });

    return { id: user.id, email: user.email, role: user.role };
  }
}
