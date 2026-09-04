import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

const ASSIGNABLE_ROLES = [
  'RETAILER',
  'DISPATCHER',
  'RIDER',
  'SUPPORT_ADMIN',
  'MANAGER_ADMIN',
] as const;

/**
 * MVP simplification, recorded here rather than silently assumed: the
 * admin sets an initial password directly, rather than the more typical
 * "send an invitation email with a token to set your own password" flow.
 * No notification/email infrastructure exists yet (see queues.md) to
 * deliver such an invitation - building that is a prerequisite for the
 * token-based flow, not this endpoint's job. The admin is expected to
 * communicate the initial password out-of-band (in person, a messaging
 * app, etc.) for MVP. A password-change-on-first-login flow would be a
 * natural next hardening step, not yet built.
 */
export class CreateUserDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsIn(ASSIGNABLE_ROLES)
  role!: (typeof ASSIGNABLE_ROLES)[number];
}
