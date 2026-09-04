import { z } from "zod";

/**
 * CONFIRMED contract (FRONTEND_API_CONTRACT.md §3/§6). Login requires
 * exactly three fields — there is no `identifier` field and no
 * email-or-phone flexibility; the backend has no concept of either. Every
 * previous assumption that a single field could serve as "email or phone"
 * was wrong and has been removed.
 *
 * `tenantSlug` is required (not optional UX polish) because `email` is
 * only unique WITHIN a tenant, not globally — the backend cannot look up
 * "which organization does this email belong to" without it.
 *
 * Password has no client-side minimum-length re-check here, matching the
 * backend's own behavior (§3: "1-128 chars, no minimum length re-check at
 * login" — only signup enforces an 8-char minimum, since login must keep
 * accepting whatever password an account already has).
 */
export const loginSchema = z.object({
  tenantSlug: z
    .string()
    .min(2, "Enter your organization ID.")
    .max(64, "Organization ID is too long.")
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      "Organization ID must be lowercase letters, numbers, and hyphens only (e.g. acme-logistics)."
    ),
  email: z.string().min(1, "Enter your email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
