import type { UserRole } from "@/types";

/**
 * Single source of truth for "where does this role land." Admin roles map
 * to a placeholder route (see routes/index.tsx) since only architectural
 * scaffolding exists for them, not real screens (Section 5 of the frontend
 * spec).
 */
export function homeRouteForRole(role: UserRole): string {
  switch (role) {
    case "RETAILER":
      return "/retailer";
    case "DISPATCHER":
      return "/dispatcher";
    case "RIDER":
      return "/rider";
    case "SUPPORT_ADMIN":
    case "OPERATIONS_ADMIN":
    case "SYSTEM_ADMIN":
      return "/admin";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}
