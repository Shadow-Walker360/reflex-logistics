import { create } from "zustand";
import type { User } from "@/types";

/**
 * In-memory session state. Deliberately NOT persisted to localStorage by
 * default — token storage strategy is a BACKEND DEPENDENCY (Section 20 of
 * the frontend spec: "to be validated against the backend's chosen auth
 * mechanism"). Holding it only in memory means a hard refresh logs the
 * user out until session-refresh (Section 7) is implemented against a
 * confirmed backend contract; that's an intentional, documented gap, not
 * an oversight — see client/README.md "Backend Dependencies".
 *
 * This store is UI/session state, not server data — TanStack Query owns
 * everything else that comes from the API (Section "STATE MANAGEMENT").
 */
interface AuthState {
  user: User | null;
  /** Bearer token for API requests. Never logged, never rendered. */
  token: string | null;
  status: "idle" | "authenticated" | "unauthenticated";
  setSession: (user: User, token: string) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  status: "idle",
  setSession: (user, token) => set({ user, token, status: "authenticated" }),
  clearSession: () => set({ user: null, token: null, status: "unauthenticated" }),
}));

/**
 * Non-reactive accessor for use outside React components (e.g. the API
 * client's header-injection boundary, where a hook can't be called).
 */
export function getAuthToken(): string | null {
  return useAuthStore.getState().token;
}
