import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/state/authStore";
import { useAuth } from "./AuthProvider";

/**
 * Gates a route tree behind authentication.
 *
 * IMPORTANT (Section 7 of the frontend spec): this is a UX convenience,
 * not a security boundary. It prevents an unauthenticated browser from
 * rendering role-specific screens, which is good for UX and avoids
 * flashing content that then errors out — but every API call those
 * screens make is independently authorized (or rejected) by the backend
 * regardless of what this component decides. A user who bypasses this
 * (e.g. via devtools) gains nothing but a confusing UI full of failed
 * requests.
 */
export function ProtectedRoute() {
  const { isBootstrapping } = useAuth();
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-graphite-500">
        Loading your session…
      </div>
    );
  }

  if (status !== "authenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
