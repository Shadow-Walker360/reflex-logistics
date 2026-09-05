import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "@/state/authStore";
import type { UserRole } from "@/types";
import { homeRouteForRole } from "./roleRouting";

export interface RoleRouteProps {
  allow: UserRole[];
}

/**
 * Restricts a route tree to specific roles. As with ProtectedRoute, this
 * is UX shaping only (Section 8/10: "frontend role checks are NOT the
 * final security boundary") — it stops a Retailer user from *seeing* the
 * Dispatch Center UI, it does not stop their browser from calling
 * dispatcher endpoints, which the backend must reject on its own.
 *
 * A role mismatch redirects to that user's own home route rather than a
 * generic 403 page, since "you're logged in, just not into this" is a
 * different situation from "you're not logged in at all."
 */
export function RoleRoute({ allow }: RoleRouteProps) {
  const user = useAuthStore((s) => s.user);

  if (!user) {
    // Should be unreachable if nested under ProtectedRoute, but fail safe.
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(user.role)) {
    return <Navigate to={homeRouteForRole(user.role)} replace />;
  }

  return <Outlet />;
}
