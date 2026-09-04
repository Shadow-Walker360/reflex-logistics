import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "@/state/authStore";
import { authService } from "@/services/authService";
import type { LoginCredentials, SignupRequest } from "@/services/authService";
import { decodeAccessToken } from "@/utils/jwt";
import type { User } from "@/types";

/**
 * Auth architecture, aligned to the CONFIRMED backend contract
 * (FRONTEND_API_CONTRACT.md). This provider owns:
 *  - exposing login/signup/logout actions
 *  - exposing loading state (kept for structural compatibility with
 *    ProtectedRoute, RoleRoute, and the layouts, which all read
 *    `isBootstrapping`)
 *
 * WHAT CHANGED FROM THE PREVIOUS REVISION, AND WHY:
 *  - No `GET /auth/me` call on mount. That endpoint does not exist —
 *    confirmed by direct inspection of the backend's auth.controller.ts
 *    (FRONTEND_API_CONTRACT.md §3). Calling it produced a 404 on every
 *    app load. Removed, not worked around.
 *  - `isBootstrapping` now resolves synchronously to `false` rather than
 *    waiting on a network call. Since tokens are memory-only (see
 *    state/authStore.ts) and there is no session-bootstrap endpoint to
 *    ask even in principle, there is genuinely nothing to check on a
 *    fresh app load — every fresh load starts logged out. Kept as state
 *    (not deleted outright) so ProtectedRoute's brief loading render and
 *    the layouts' existing `useAuth()` usage don't need to change shape;
 *    a future revision that adds token persistence would restore real
 *    async work here.
 *  - `login`/`signup` no longer read a `user` field off the response —
 *    neither endpoint returns one (confirmed §4). Both now decode the
 *    returned `accessToken`'s JWT payload for `id`/`tenantId`/`role`,
 *    the only fields the backend actually provides about the
 *    authenticated user. The `email` the person typed is attached
 *    separately, for display only — see types/user.ts's docstring.
 *  - `logout` now sends the current `refreshToken` in the request body,
 *    matching the confirmed `LogoutRequest` shape (§3) — the backend
 *    revokes based on the token in the body, not the bearer header alone.
 *
 * Token refresh itself lives in src/api/client.ts (silent 401→refresh→
 * retry) and src/api/refreshCoordinator.ts — this provider doesn't drive
 * that directly, it just reacts to the resulting session state.
 */

interface AuthContextValue {
  isBootstrapping: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (payload: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function userFromAccessToken(accessToken: string, email: string): User {
  const payload = decodeAccessToken(accessToken);
  return { id: payload.sub, tenantId: payload.tenantId, role: payload.role, email };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // No async bootstrap work today — see docstring above. Held as state
  // (not a plain `const false`) so this can grow real async logic again
  // without changing AuthContextValue's shape or any consumer.
  const [isBootstrapping] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const clearSession = useAuthStore((s) => s.clearSession);

  const login = async (credentials: LoginCredentials) => {
    const { accessToken, refreshToken } = await authService.login(credentials);
    setSession(userFromAccessToken(accessToken, credentials.email), { accessToken, refreshToken });
  };

  const signup = async (payload: SignupRequest) => {
    const { accessToken, refreshToken } = await authService.signup(payload);
    setSession(userFromAccessToken(accessToken, payload.email), { accessToken, refreshToken });
  };

  const logout = async () => {
    const refreshToken = useAuthStore.getState().refreshToken;
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } finally {
      // Always clear local session state even if the backend call fails —
      // an unreachable backend must not trap the user in a logged-in UI.
      // Logout is confirmed idempotent server-side (§3), so this is safe
      // to attempt even with a token that's already invalid.
      clearSession();
    }
  };

  return (
    <AuthContext.Provider value={{ isBootstrapping, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- kept alongside AuthProvider deliberately; see AuthProvider.tsx's earlier history for why a file split caused Windows-only Vitest failures.
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
