import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "@/state/authStore";
import { authService } from "@/services/authService";
import type { LoginCredentials, SignupRequest } from "@/services/authService";
import { ApiError } from "@/api/errors";

/**
 * Auth architecture, aligned to FULL_SCALE_DELIVERY_DIRECTIVE.md §4/§8.
 * This provider owns:
 *  - bootstrapping session state on app load (GET /auth/me)
 *  - exposing login/logout actions
 *  - exposing loading state while that bootstrap check is in flight
 *
 * Token refresh itself lives in src/api/client.ts (silent 401→refresh→
 * retry) and src/api/refreshCoordinator.ts — this provider doesn't drive
 * that directly, it just reacts to the resulting session state.
 *
 * KNOWN GAP: the access/refresh tokens are held in memory only
 * (state/authStore.ts), not persisted. A hard page refresh has nothing to
 * send to GET /auth/me, so the bootstrap check below will get a 401 and
 * correctly land the user back on Login — that's expected given today's
 * storage strategy, not a bug. See client/README.md §12 for the open
 * question of how the backend expects the refresh token to be persisted
 * (e.g. an httpOnly cookie the frontend never touches directly, vs.
 * something this app would need to store itself).
 */

interface AuthContextValue {
  isBootstrapping: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (payload: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  useEffect(() => {
    let cancelled = false;
    // Best-effort session check on load. If there's no active session
    // (401) this is expected, not an error to surface — it just means the
    // user needs to log in.
    authService
      .getCurrentUser()
      .then(({ user }) => {
        if (!cancelled) {
          // No tokens to set here — if this call succeeded at all, it's
          // because a token already existed in the store (e.g. a
          // same-session remount, not a hard refresh). Just confirm the
          // user record.
          useAuthStore.setState({ user, status: "authenticated" });
        }
      })
      .catch((err) => {
        if (!cancelled && !(err instanceof ApiError && err.category === "UNAUTHENTICATED")) {
          // An unexpected error (not just "no session") — still fail
          // closed to logged-out, but this is where telemetry would hook
          // in (not yet implemented — see README §13 PLANNED).
        }
      })
      .finally(() => {
        if (!cancelled) setIsBootstrapping(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    const { user, accessToken, refreshToken } = await authService.login(credentials);
    setSession(user, { accessToken, refreshToken });
  };

  const signup = async (payload: SignupRequest) => {
    const { user, accessToken, refreshToken } = await authService.register(payload);
    setSession(user, { accessToken, refreshToken });
  };

  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      // Always clear local session state even if the backend call fails —
      // an unreachable backend must not trap the user in a logged-in UI.
      clearSession();
    }
  };

  return (
    <AuthContext.Provider value={{ isBootstrapping, login, signup, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
