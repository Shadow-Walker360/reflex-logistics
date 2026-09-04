import { z } from "zod";

/**
 * Role-based sign-up. This is NOT part of the published contract
 * (FULL_SCALE_DELIVERY_DIRECTIVE.md §8 lists only login/refresh/logout/me —
 * no register endpoint), so /auth/register and everything below is a
 * frontend PROPOSAL for the backend team to confirm or reject, same as
 * everything in docs/api-contract.md.
 *
 * DESIGN DECISION (documented, not silent): self-service sign-up only
 * offers RETAILER, DISPATCHER, and RIDER — never the admin roles
 * (SUPPORT_ADMIN, MANAGER_ADMIN, SYSTEM_ADMIN). Letting anyone self-assign
 * an admin role at sign-up would be a privilege-escalation hole regardless
 * of what the frontend hides; admin accounts should be provisioned
 * internally. This is a frontend UX decision, not a security boundary —
 * the backend must independently reject an admin role on this endpoint
 * even if a client is crafted to send one directly.
 *
 * TENANCY DESIGN (the harder part of this form): the three self-serve
 * roles don't relate to a tenant the same way —
 *   - RETAILER signing up is creating a NEW business account, i.e. a NEW
 *     tenant. That's a materially different operation from "joining" one,
 *     so it asks for a business name instead of any tenant identifier.
 *   - DISPATCHER and RIDER are operationally tied to an existing
 *     retailer's fleet — they join an existing organization, they don't
 *     create one. Rather than let them supply a raw tenant ID (which
 *     would let a client claim access to any tenant merely by knowing its
 *     ID — exactly what "never trust a tenant ID supplied by the browser"
 *     forbids), they supply an organization invite code instead. The
 *     backend resolves that code to a tenant and validates it; the
 *     frontend never sees or asserts a tenant ID during sign-up.
 */

export const SIGNUP_ROLES = ["RETAILER", "DISPATCHER", "RIDER"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

const baseFields = {
  name: z.string().min(1, "Enter your full name."),
  identifier: z.string().min(1, "Enter your phone number or email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string().min(1, "Confirm your password."),
};

export const signupSchema = z
  .discriminatedUnion("role", [
    z.object({
      role: z.literal("RETAILER"),
      businessName: z.string().min(1, "Enter your business name."),
      ...baseFields,
    }),
    z.object({
      role: z.literal("DISPATCHER"),
      organizationCode: z.string().min(1, "Enter your organization's invite code."),
      ...baseFields,
    }),
    z.object({
      role: z.literal("RIDER"),
      organizationCode: z.string().min(1, "Enter your organization's invite code."),
      ...baseFields,
    }),
  ])
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type SignupFormValues = z.infer<typeof signupSchema>;
