import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Enforces that a boolean field is literally `true` - not merely present,
 * not merely a boolean. Used for the terms-and-conditions acceptance
 * checkbox on signup (ADR-012): `acceptedTerms: false` or `acceptedTerms`
 * omitted must both fail validation, distinctly from "not a boolean at
 * all" (which @IsBoolean() already catches). Kept as a standalone,
 * reusable decorator rather than inline logic in AuthService, since "the
 * checkbox must be checked" is exactly the kind of rule that belongs in
 * input validation (spec Section 35), not business logic.
 */
export function MustBeTrue(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'mustBeTrue',
      target: object.constructor,
      propertyName,
      options: {
        message: `${propertyName} must be true.`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown) {
          return value === true;
        },
      },
    });
  };
}
