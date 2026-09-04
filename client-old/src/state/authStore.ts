import { create } from "zustand";
import type { User } from "@/types";

/**
 * In-memory session state. Deliberately NOT persisted to localStorage —
 * per the directive's refresh-token model (DB-backed hashed refresh
 * tokens, FULL_SCALE_DELIVERY_DIRECTIVE.md §11), the refresh token is
 * sensitive enough that persisting it in localStorage would be a real
 * XSS exposure; a hard page refresh logs the user out until session
 * bootstrap (GET /auth/me) re-establishes it via whatever the backend's
 * actual persistence mechanism turns out to be (e.g. an httpOnly cookie
 * carrying the refresh token, which this frontend would never need to
 * read directly). This is a known, documented gap — see
 * client/README.md §12 — not an oversight.
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
