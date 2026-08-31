/**
 * The set of role names. Deliberately duplicated here as a plain string
 * union rather than imported from `@prisma/client`'s generated `UserRole`
 * enum: this keeps TokenService (which only needs to embed/read a role
 * string in a JWT) decoupled from the Prisma-generated client, so JWT
 * mechanics can be unit-tested independently of Prisma's generate step.
 * `AuthService`, which reads/writes real `User` rows, uses the generated
 * `UserRole` type directly and is the single place that bridges the two -
 * a mismatch between this union and the Prisma schema's enum would be
 * caught there (and should be caught by an integration test once Prisma
 * generation is unblocked - see docs/database.md).
 */
export type RoleName =
  | 'RETAILER'
  | 'DISPATCHER'
  | 'RIDER'
  | 'SUPPORT_ADMIN'
  | 'MANAGER_ADMIN'
  | 'SYSTEM_ADMIN';

/**
 * The claims embedded in every access and refresh token.
 *
 * Spec reference: Section 8 (Multi-Tenancy) - "the authenticated identity
 * and authorized tenant context must determine access." tenantId and role
 * are embedded here specifically so that every downstream guard/service
 * derives tenant and role from the verified, signed token - never from a
 * client-supplied header, query param, or body field.
 */
export interface AccessTokenPayload {
  sub: string; // user id
  tenantId: string;
  role: RoleName;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  tenantId: string;
  type: 'refresh';
  /**
   * A random id unique to this specific refresh token, used to locate the
   * corresponding hashed row in RefreshToken without storing/trusting the
   * raw token itself.
   */
  jti: string;
}

/**
 * What `request.user` looks like after JwtAuthGuard has run. Every guard,
 * decorator, and service downstream of authentication should type against
 * this, not against the raw JWT payload, keeping "what a verified caller
 * looks like" defined in exactly one place.
 */
export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  role: RoleName;
}
