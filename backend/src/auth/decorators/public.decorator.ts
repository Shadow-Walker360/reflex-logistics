import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route as not requiring authentication. Spec Section 6/7:
 * authentication/authorization is enforced server-side by default - routes
 * must opt OUT of the global guard explicitly (e.g. login, refresh), never
 * opt in by omission. This is the deliberate default-deny posture.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
