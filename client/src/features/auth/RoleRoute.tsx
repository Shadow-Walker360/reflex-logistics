import { Navigate, Outlet } from "react-router-dom";

import { useAuthStore } from "@/state/authStore";
import type { UserRole } from "@/types";
import { homeRouteForRole } from "./roleRouting";

export interface RoleRouteProps {
  allow: UserRole[];
}

/**
 * Restricts a route tree to specific roles.
 *
 * This is a frontend UX gate only. The backend remains the
 * authoritative security boundary and independently authorizes
 * every protected API request.
 */
export function RoleRoute({ allow }: RoleRouteProps) {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allow.includes(user.role)) {
    return (
      <Navigate
        to={homeRouteForRole(user.role)}
        replace
      />
    );
  }

  return <Outlet />;
}