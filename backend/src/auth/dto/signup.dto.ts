import {
  IsBoolean,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MustBeTrue } from '../../common/validators/must-be-true.validator';

/**
 * Spec deviation, recorded: the original specification (Section 6)
 * deferred self-service signup to [FUTURE], MVP was meant to be
 * admin/retailer-created accounts only. This was overridden by explicit
 * product direction to support self-service tenant signup for launch -
 * see ADR-012 for the full record of that decision, including what it
 * does and doesn't change about the rest of the auth model.
 *
 * Signup creates a NEW tenant and its first user (a MANAGER_ADMIN for
 * that tenant) in one transaction - this is organization signup, not an
 * invite-an-existing-tenant-member flow (which would need an invitation
 * token and is not built).
 */
export class SignupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  organizationName!: string;

  // URL/subdomain-safe identifier - see ADR-009 for why a tenant slug is
  // needed at all (email is only unique per-tenant, not globally).
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message:
      'tenantSlug must be lowercase alphanumeric with single hyphens between segments (e.g. "acme-logistics").',
  })
  tenantSlug!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsString()
  @MinLength(8) // signup enforces a minimum; login does not re-check this by design (Section 6: don't leak requirements via error messages on existing accounts)
  @MaxLength(128)
  password!: string;

  @IsBoolean()
  @MustBeTrue({
    message: 'You must accept the Terms and Conditions to sign up.',
  })
  acceptedTerms!: boolean;
}
