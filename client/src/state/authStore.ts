import { create } from "zustand";
import type { User } from "@/types";

/**
 * In-memory session state. Deliberately NOT persisted to localStorage —
 * storing a refresh token client-side in localStorage is a real XSS
 * exposure, and there's no backend-provided alternative to lean on: the
 * backend confirms it uses no cookies at all (FRONTEND_API_CONTRACT.md
 * §7 — "No cookies are used anywhere") and has no session-bootstrap
 * endpoint (§3 — `GET /auth/me` does not exist). So a hard page refresh
 * genuinely logs the user out today; there is nothing to bootstrap from
 * even in principle without the frontend choosing to persist a token
 * itself, which is a deliberate trade-off left undecided here, not an
 * oversight — see client/README.md.
 *
 * This store is UI/session state, not server data — TanStack Query owns
 * everything else that comes from the API.
 */
interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: "idle" | "authenticated" | "unauthenticated";
  setSession: (user: User, tokens: { accessToken: string; refreshToken: string }) => void;
  /** Updates tokens only, keeping the current user — used after a silent refresh. */
  setTokens: (tokens: { accessToken: string; refreshToken: string }) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  status: "idle",
  setSession: (user, tokens) =>
    set({ user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, status: "authenticated" }),
  setTokens: (tokens) => set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }),
  clearSession: () => set({ user: null, accessToken: null, refreshToken: null, status: "unauthenticated" }),
}));

/** Non-reactive accessors for use outside React components (e.g. api/client.ts's header-injection boundary). */
export function getAuthToken(): string | null {
  return useAuthStore.getState().accessToken;
}

export function getRefreshToken(): string | null {
  return useAuthStore.getState().refreshToken;
}
