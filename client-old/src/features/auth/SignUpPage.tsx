import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Store, Radar, Bike, Eye, EyeOff } from "lucide-react";
import { Button, Input, Alert } from "@/components";
import { useAuth } from "./AuthProvider";
import { signupSchema, SIGNUP_ROLES, type SignupRole } from "./signupSchema";
import type { SignupRequest } from "@/services/authService";
import { ApiError } from "@/api/errors";
import { useAuthStore } from "@/state/authStore";
import { homeRouteForRole } from "./roleRouting";
import { AuthVisual } from "./AuthVisual";

/**
 * Role-based sign-up (see signupSchema.ts for the full tenancy/security
 * reasoning). One deliberate architectural choice worth stating plainly:
 * role selection lives HERE, not on the Sign In page. A role is
 * ESTABLISHED at sign-up and READ from the account thereafter — sign-in
 * only needs credentials, because asking a returning user to reassert
 * their own role would be meaningless (the backend already knows it) and
 * would open a confusing UI question ("what if they pick wrong?") that
 * doesn't need to exist. See LoginPage — it intentionally has no role
 * selector.
 */

const ROLE_META: Record<SignupRole, { label: string; description: string; icon: typeof Store }> = {
  RETAILER: {
    label: "Retailer",
    description: "Create deliveries and track them for your business.",
    icon: Store,
  },
  DISPATCHER: {
    label: "Dispatcher",
    description: "Coordinate riders and vehicles for your organization.",
    icon: Radar,
  },
  RIDER: {
    label: "Rider",
    description: "Accept and fulfill deliveries on the road.",
    icon: Bike,
  },
};

const SIGNUP_ERROR_MESSAGES: Partial<Record<ApiError["category"], string>> = {
  CONFLICT: "An account with that email or phone already exists.",
  NETWORK_ERROR: "We couldn't connect to Reflex. Check your connection and try again.",
};

interface FormState {
  role: SignupRole;
  name: string;
  identifier: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  organizationCode: string;
}

const INITIAL_STATE: FormState = {
  role: "RETAILER",
  name: "",
  identifier: "",
  password: "",
  confirmPassword: "",
  businessName: "",
  organizationCode: "",
};

function toSignupRequest(form: FormState): SignupRequest {
  const shared = { name: form.name, identifier: form.identifier, password: form.password };
  if (form.role === "RETAILER") {
    return { role: "RETAILER", ...shared, businessName: form.businessName };
  }
  return { role: form.role, ...shared, organizationCode: form.organizationCode };
}

export function SignUpPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const candidate =
      form.role === "RETAILER"
        ? {
            role: "RETAILER" as const,
            name: form.name,
            identifier: form.identifier,
            password: form.password,
            confirmPassword: form.confirmPassword,
            businessName: form.businessName,
          }
        : {
            role: form.role,
            name: form.name,
            identifier: form.identifier,
            password: form.password,
            confirmPassword: form.confirmPassword,
            organizationCode: form.organizationCode,
          };

    const result = signupSchema.safeParse(candidate);
    if (!result.success) {
      const fieldErrors: Partial<Record<string, string>> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string") fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await signup(toSignupRequest(form));
      const user = useAuthStore.getState().user;
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
    } finally {
      setIsSubmitting(false);
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
              Join the operational backbone of Kenyan logistics.
            </p>
            <p className="mt-3 text-body text-graphite-300">
              Whether you're running deliveries, dispatching riders, or on the road — Reflex has a
              workspace for you.
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
            <h1 className="text-page-title text-foreground">Create your account</h1>
            <p className="mb-6 mt-1 text-supporting text-muted">Choose the workspace you're joining.</p>

            {/* Role selector — three cards, not a plain <select>, so the
                choice reads as "which workspace" rather than a buried
                dropdown value. Admin roles are never offered — see
                signupSchema.ts docstring for why. */}
            <div className="mb-5 grid grid-cols-3 gap-2">
              {SIGNUP_ROLES.map((role) => {
                const meta = ROLE_META[role];
                const Icon = meta.icon;
                const isSelected = form.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setField("role", role)}
                    aria-pressed={isSelected}
                    className={`flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-center transition-colors duration-150 ${
                      isSelected
                        ? "border-primary bg-olive-50 text-olive-700"
                        : "border-border bg-surface text-muted hover:bg-graphite-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    <span className="text-caption font-semibold">{meta.label}</span>
                  </button>
                );
              })}
            </div>
            <p className="mb-5 text-caption text-muted">{ROLE_META[form.role].description}</p>

            {submitError && (
              <Alert tone="danger" className="mb-4">
                {submitError}
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Input
                label="Full name"
                required
                autoComplete="name"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                error={errors.name}
              />
              <Input
                label="Email or phone"
                required
                autoComplete="username"
                value={form.identifier}
                onChange={(e) => setField("identifier", e.target.value)}
                error={errors.identifier}
              />

              {form.role === "RETAILER" ? (
                <Input
                  label="Business name"
                  required
                  hint="This creates a new Reflex workspace for your business."
                  value={form.businessName}
                  onChange={(e) => setField("businessName", e.target.value)}
                  error={errors.businessName}
                />
              ) : (
                <Input
                  label="Organization invite code"
                  required
                  hint="Ask your dispatcher or manager for your organization's invite code."
                  value={form.organizationCode}
                  onChange={(e) => setField("organizationCode", e.target.value)}
                  error={errors.organizationCode}
                />
              )}

              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                error={errors.password}
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
              />
              <Input
                label="Confirm password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={(e) => setField("confirmPassword", e.target.value)}
                error={errors.confirmPassword}
              />

              <Button type="submit" isLoading={isSubmitting} className="mt-2 w-full" size="lg">
                {isSubmitting ? "Creating account…" : "Create account"}
              </Button>
            </form>

            <p className="mt-5 text-center text-supporting text-muted">
              Already have an account?{" "}
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
