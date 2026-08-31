import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input, Alert } from "@/components";
import { useAuth } from "./AuthProvider";
import { loginSchema, type LoginFormValues } from "./loginSchema";
import { ApiError } from "@/api/errors";
import { useAuthStore } from "@/state/authStore";
import { homeRouteForRole } from "./roleRouting";
import { AuthVisual } from "./AuthVisual";

/**
 * Login-specific error copy (docs/ux-guidelines.md "Authentication UX").
 * The generic API_ERROR_MESSAGES (src/api/errors.ts) phrases UNAUTHENTICATED
 * as "your session has ended," which is correct for an expired session but
 * wrong for a failed login attempt — a 401 on the login endpoint means
 * "wrong credentials," not "you were logged in and now aren't." This map
 * overrides copy for the categories the brief calls out explicitly (§11);
 * anything else falls back to the shared API_ERROR_MESSAGES.
 */
const LOGIN_ERROR_MESSAGES: Partial<Record<ApiError["category"], string>> = {
  UNAUTHENTICATED: "Your email or password is incorrect.",
  FORBIDDEN: "You don't have permission to access this workspace.",
  NETWORK_ERROR: "We couldn't connect to Reflex. Check your connection and try again.",
};

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setSubmitError(null);
    try {
      await login(values);
      const user = useAuthStore.getState().user;
      // Role-based post-login routing (brief §12): destination is derived
      // from the authenticated user's role as returned by the backend
      // (homeRouteForRole reads user.role from the login response), never
      // from anything the client supplied. This is navigation only — the
      // backend independently authorizes every request those screens make.
      const redirectTo =
        (location.state as { from?: Location } | null)?.from?.pathname ??
        (user ? homeRouteForRole(user.role) : "/");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(
          LOGIN_ERROR_MESSAGES[err.category] ??
            "Something went wrong while signing you in. Please try again."
        );
      } else {
        setSubmitError("Something unexpected happened. Please try again.");
      }
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left — brand/product story. Hidden below md; the form is always
          the primary focus on mobile (brief §10). */}
      <div className="relative hidden w-1/2 overflow-hidden bg-graphite-950 md:block">
        <div className="absolute inset-0">
          <AuthVisual />
        </div>
        <div className="relative flex h-full flex-col justify-between p-12">
          <Wordmark tone="dark" />
          <div className="max-w-sm">
            <p className="font-display text-3xl font-semibold leading-tight text-white">
              Move every delivery with confidence.
            </p>
            <p className="mt-3 text-body text-graphite-300">
              Reflex coordinates retailers, dispatchers, and riders on one operational platform —
              built for Kenyan logistics.
            </p>
          </div>
          <p className="text-caption text-graphite-500">© {new Date().getFullYear()} Reflex Logistics</p>
        </div>
      </div>

      {/* Right — sign-in card */}
      <div className="flex w-full flex-1 items-center justify-center px-6 py-12 md:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 md:hidden">
            <Wordmark tone="light" />
          </div>

          <div className="glass-pearl rounded-lg p-7 sm:p-8">
            <h1 className="text-page-title text-foreground">Welcome back</h1>
            <p className="mb-6 mt-1 text-supporting text-muted">
              Sign in to your Reflex workspace to continue.
            </p>

            {submitError && (
              <Alert tone="danger" className="mb-4" role="alert">
                {submitError}
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
              <Input
                label="Email or phone"
                required
                autoComplete="username"
                error={errors.identifier?.message}
                {...register("identifier")}
              />
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
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

              {/*
                No "remember me" and no "forgot password" — neither is a
                confirmed backend capability yet (brief §9: "do not invent
                authentication capabilities the backend does not support").
                See client/README.md §12 Backend Dependencies.
              */}

              <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full" size="lg">
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Wordmark({ tone }: { tone: "dark" | "light" }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-md font-display text-sm font-bold ${
          tone === "dark" ? "bg-olive-500 text-graphite-950" : "bg-primary text-white"
        }`}
        aria-hidden="true"
      >
        R
      </span>
      <span className={`font-display text-lg font-semibold tracking-tight ${tone === "dark" ? "text-white" : "text-foreground"}`}>
        Reflex
      </span>
    </div>
  );
}
