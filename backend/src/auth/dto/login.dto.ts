import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * See ADR-009: tenantSlug is required because email is only unique within
 * a tenant, not globally.
 *
 * MaxLength bounds added post-Phase-2 audit: without them, an
 * unreasonably large request body (still under Express's default JSON
 * body-size limit, but large enough to be wasteful) could reach bcrypt
 * unnecessarily. bcrypt itself silently truncates its effective input at
 * 72 bytes, so an oversized password provides no security benefit to the
 * caller - bounding it here just avoids doing pointless work on obviously
 * malformed input before it gets anywhere near a password comparison.
 */
export class LoginDto {
  @IsString()
  @MaxLength(64)
  tenantSlug!: string;

  @IsEmail()
  @MaxLength(254) // RFC 5321 maximum email length
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  password!: string;
}
