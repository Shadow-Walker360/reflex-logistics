import { z } from "zod";

/**
 * CONFIRMED contract (FRONTEND_API_CONTRACT.md §2/§5). Signup creates a
 * NEW organization (tenant) and its first user — it is not "create an
 * account within an existing org." The created user's role is ALWAYS
 * `MANAGER_ADMIN`, assigned by the backend; it is not a request field.
 *
 * THIS IS WHY THE PREVIOUS ROLE-SELECTOR UI IS GONE: an earlier revision
 * offered Retailer/Dispatcher/Rider as sign-up choices with a
 * businessName/organizationCode split. That never matched anything the
 * backend actually does — there is no "join an existing org via invite
 * code" endpoint, and the backend cannot accept a client-chosen role at
 * signup at all. Every role other than MANAGER_ADMIN is created via
 * `POST /admin/users`, callable only by an already-authenticated
 * MANAGER_ADMIN/SYSTEM_ADMIN within a tenant — a separate, admin-only
 * flow, not a public sign-up screen. That admin-invite UI does not exist
 * yet; this file does not pretend otherwise. See client/README.md for
 * where that work is tracked.
 */
export const signupSchema = z
  .object({
    organizationName: z
      .string()
      .min(2, "Enter your organization's name.")
      .max(120, "Organization name is too long."),
    tenantSlug: z
      .string()
      .min(2, "Choose an organization ID.")
      .max(64, "Organization ID is too long.")
      .regex(
        /^[a-z0-9]+(-[a-z0-9]+)*$/,
        "Use lowercase letters, numbers, and hyphens only (e.g. acme-logistics)."
      ),
    email: z.string().min(1, "Enter your email.").email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password is too long."),
    confirmPassword: z.string().min(1, "Confirm your password."),
    // Typed as boolean here (not zod's literal(true)) and asserted to the
    // literal `true` SignupRequest.acceptedTerms expects at the point the
    // request payload is built (toSignupRequest, below) — by then the
    // refine() below has already guaranteed it. Avoids relying on
    // z.literal's errorMap option, whose exact shape has shifted across
    // zod versions.
    acceptedTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.acceptedTerms === true, {
    message: "You must accept the Terms of Service and Privacy Policy to continue.",
    path: ["acceptedTerms"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;

/** Builds the exact SignupRequest payload — separate from SignupFormValues
 * so the boolean->literal-true narrowing lives in one obvious place. */
export function toSignupRequest(values: SignupFormValues) {
  return {
    organizationName: values.organizationName,
    tenantSlug: values.tenantSlug,
    email: values.email,
    password: values.password,
    acceptedTerms: true as const,
  };
}
