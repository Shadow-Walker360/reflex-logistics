import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input, Alert } from "@/components";
import { useAuth } from "./AuthProvider";
import { signupSchema, toSignupRequest, type SignupFormValues } from "./signupSchema";
import { ApiError } from "@/api/errors";
import { useAuthStore } from "@/state/authStore";
import { homeRouteForRole } from "./roleRouting";
import { AuthVisual } from "./AuthVisual";

/**
 * Sign-up creates a NEW organization and its first user (always
 * MANAGER_ADMIN) — see signupSchema.ts's docstring for the full
 * reasoning and why the previous role-selector UI (Retailer/Dispatcher/
 * Rider) is gone. This is now, accurately, "create your organization,"
 * not "join Reflex as a [role]." Inviting Dispatchers/Riders/Retailers
 * into an organization is a separate, admin-only flow (`POST
 * /admin/users`) that doesn't have a UI yet — see client/README.md.
 */

const SIGNUP_ERROR_MESSAGES: Partial<Record<ApiError["category"], string>> = {
  CONFLICT: "That organization ID is already taken. Please choose another.",
  NETWORK_ERROR: "We couldn't connect to Reflex. Check your connection and try again.",
};

export function SignUpPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { acceptedTerms: false },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setSubmitError(null);
    try {
      await signup(toSignupRequest(values));
      const user = useAuthStore.getState().user;
      // Role is always MANAGER_ADMIN after signup (backend-assigned, not
      // client-chosen) — homeRouteForRole sends admin roles to /admin.
      navigate(user ? homeRouteForRole(user.role) : "/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(
          SIGNUP_ERROR_MESSAGES[err.category] ??
            "Something went wrong while creating your account. Please try again."
        );
      } else {
        setSubmitError("Something unexpected happened. Please try again.");
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-1/2 overflow-hidden bg-graphite-950 md:block">
        <div className="absolute inset-0">
          <AuthVisual />
        </div>
        <div className="relative flex h-full flex-col justify-between p-12">
          <Wordmark />
          <div className="max-w-sm">
            <p className="font-display text-3xl font-semibold leading-tight text-white">
              Set up your organization on Reflex.
            </p>
            <p className="mt-3 text-body text-graphite-300">
              Create your workspace, then invite your dispatchers and riders once you're in.
            </p>
          </div>
          <p className="text-caption text-graphite-500">© {new Date().getFullYear()} Reflex Logistics</p>
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center overflow-y-auto px-6 py-12 md:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6 md:hidden">
            <Wordmark dark={false} />
          </div>

          <div className="glass-pearl rounded-lg p-7 sm:p-8">
            <h1 className="text-page-title text-foreground">Create your organization</h1>
            <p className="mb-6 mt-1 text-supporting text-muted">
              This sets up a new Reflex workspace with you as its administrator.
            </p>

            {submitError && (
              <Alert tone="danger" className="mb-4">
                {submitError}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
              <Input
                label="Organization name"
                required
                autoComplete="organization"
                error={errors.organizationName?.message}
                {...register("organizationName")}
              />
              <Input
                label="Organization ID"
                required
                hint="Lowercase letters, numbers, and hyphens only — this is what you and your team will use to sign in (e.g. acme-logistics)."
                error={errors.tenantSlug?.message}
                {...register("tenantSlug")}
              />
              <Input
                label="Your email"
                type="email"
                required
                autoComplete="username"
                error={errors.email?.message}
                {...register("email")}
              />
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                hint="At least 8 characters."
                error={errors.password?.message}
                endAdornment={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="rounded p-1.5 text-graphite-400 hover:text-graphite-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                  </button>
                }
                {...register("password")}
              />
              <Input
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />

              <div className="flex flex-col gap-1.5">
                <label className="flex items-start gap-2 text-supporting text-graphite-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 accent-primary"
                    aria-invalid={Boolean(errors.acceptedTerms) || undefined}
                    aria-describedby={errors.acceptedTerms ? "acceptedTerms-error" : undefined}
                    {...register("acceptedTerms")}
                  />
                  <span>
                    I agree to the Reflex{" "}
                    <Link to="/terms" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:text-primary-hover">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:text-primary-hover">
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </label>
                {errors.acceptedTerms && (
                  <span id="acceptedTerms-error" role="alert" className="text-caption font-medium text-danger">
                    {errors.acceptedTerms.message}
                  </span>
                )}
              </div>

              <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full" size="lg">
                {isSubmitting ? "Creating organization…" : "Create organization"}
              </Button>
            </form>

            <p className="mt-5 text-center text-supporting text-muted">
              Already have a workspace?{" "}
              <Link to="/login" className="font-medium text-primary hover:text-primary-hover">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Wordmark({ dark = true }: { dark?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-md font-display text-sm font-bold ${
          dark ? "bg-olive-500 text-graphite-950" : "bg-primary text-white"
        }`}
        aria-hidden="true"
      >
        R
      </span>
      <span className={`font-display text-lg font-semibold tracking-tight ${dark ? "text-white" : "text-foreground"}`}>
        Reflex
      </span>
    </div>
  );
}
