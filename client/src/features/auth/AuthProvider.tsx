import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "@/state/authStore";
import { authService } from "@/services/authService";
import type { LoginCredentials } from "@/services/authService";
import { ApiError } from "@/api/errors";

/**
 * Auth architecture (Section 7 of the frontend spec). This provider owns:
 *  - bootstrapping session state on app load (best-effort session check)
 *  - exposing login/logout actions
 *  - exposing loading state while that bootstrap check is in flight
 *
 * It does NOT implement token refresh — that's a BACKEND DEPENDENCY
 * (see client/README.md). Until the refresh contract is confirmed, a
 * session simply ends on hard refresh once the in-memory token is gone;
 * ProtectedRoute below sends the user back to Login in that case, which is
 * the correct behavior for an unconfirmed contract, not a bug.
 */

interface AuthContextValue {
  isBootstrapping: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
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
      .getSession()
      .then(({ user }) => {
        if (!cancelled) {
          // NOTE: getSession's response doesn't carry a token in this
          // provisional contract (a real session-cookie or refresh-token
          // exchange would supply one) — see README. Marking this branch
          // clearly rather than inventing a token value.
          if (!cancelled) useAuthStore.getState().setSession(user, "");
        }
      })
      .catch((err) => {
        if (!cancelled && !(err instanceof ApiError && err.category === "UNAUTHENTICATED")) {
          // An unexpected error (not just "no session") — still fail
          // closed to logged-out, but this is where telemetry would hook
          // in (Section 24, not yet implemented).
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
    const { user, token } = await authService.login(credentials);
    setSession(user, token);
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
    <AuthContext.Provider value={{ isBootstrapping, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
