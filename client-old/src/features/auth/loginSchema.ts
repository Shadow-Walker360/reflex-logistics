import { z } from "zod";

/**
 * PROVISIONAL — validates shape only (non-empty identifier + password).
 * The actual identifier format (phone vs email vs both) and whether OTP
 * replaces password entirely is an open question (see README "Backend
 * Dependencies"). This schema is intentionally permissive until that's
 * confirmed, rather than guessing a strict phone/email regex that might
 * reject valid input.
 */
export const loginSchema = z.object({
  identifier: z.string().min(1, "Enter your phone number or email."),
  password: z.string().min(1, "Enter your password."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
