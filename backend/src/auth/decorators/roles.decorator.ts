import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../types/auth.types';

export const ROLES_KEY = 'roles';

/**
 * Spec reference: Section 7 (Authorization / RBAC).
 * Usage: @Roles('DISPATCHER', 'MANAGER_ADMIN')
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
