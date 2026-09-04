import { apiClient } from "@/api/client";
import { setRefreshHandler } from "@/api/refreshCoordinator";
import { useAuthStore } from "@/state/authStore";

/**
 * Auth endpoint paths, payload shapes, and response shapes below are
 * CONFIRMED against real backend source (controllers, DTOs, Prisma
 * schema) per FRONTEND_API_CONTRACT.md — not a proposal, not a guess.
 * This supersedes every previous "PROVISIONAL" auth contract assumption
 * in this codebase.
 *
 * Confirmed endpoints (§2/§3/§10):
 *   POST /auth/signup   → { accessToken, refreshToken }  (201)
 *   POST /auth/login    → { accessToken, refreshToken }  (200)
 *   POST /auth/refresh  → { accessToken, refreshToken }  (200, tokens rotate)
 *   POST /auth/logout   → 204, body: { refreshToken }
 *
 * CONFIRMED NOT TO EXIST: GET /auth/me. There is no session-bootstrap
 * endpoint (§3) — direct inspection of the backend's auth.controller.ts
 * shows no such route registered. Do not add a call to it. Session
 * identity comes from decoding the access token's JWT payload instead —
 * see src/utils/jwt.ts and src/features/auth/AuthProvider.tsx.
 *
 * None of the four calls below return a `user` object — see
 * types/user.ts's docstring for why and how the frontend reconstructs a
 * minimal User from the JWT instead.
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Login contract, confirmed §3/§6. There is no `identifier` field and no
 * email-or-phone flexibility — the backend has no such concept. `email`
 * is unique only WITHIN a tenant (not globally), so `tenantSlug` is a
 * required third field, not optional UX polish: without it, the backend
 * has no way to know which organization's user table to check.
 */
export interface LoginCredentials {
  tenantSlug: string;
  email: string;
  password: string;
}

/**
 * Signup contract, confirmed §2/§5. Signup ALWAYS creates a brand-new
 * organization (tenant) and its first user, who is ALWAYS assigned the
 * `MANAGER_ADMIN` role by the backend — role is not a request field and
 * cannot be chosen here. Every other role (RETAILER, DISPATCHER, RIDER,
 * SUPPORT_ADMIN, and additional MANAGER_ADMINs) is created via
 * `POST /admin/users` by an existing MANAGER_ADMIN/SYSTEM_ADMIN within
 * that tenant — a separate, authenticated, admin-only flow that is not
 * built in this pass (see client/README.md).
 */
export interface SignupRequest {
  organizationName: string;
  /** 2-64 chars, lowercase alphanumeric with single hyphens: /^[a-z0-9]+(-[a-z0-9]+)*$/ */
  tenantSlug: string;
  email: string;
  /** 8-128 chars. */
  password: string;
  /** Must be the literal boolean `true` — the backend rejects `false` or omission. */
  acceptedTerms: true;
}

export const authService = {
  signup: (payload: SignupRequest) =>
    apiClient.post<AuthTokens>("/auth/signup", payload, { skipAuth: true }),

  login: (credentials: LoginCredentials) =>
    apiClient.post<AuthTokens>("/auth/login", credentials, { skipAuth: true }),

  /**
   * Refresh tokens ROTATE on every use (§3, §7) — the backend immediately
   * revokes the token just spent and issues a new one. The caller must
   * store the new refreshToken and discard the old one; retrying with a
   * stale refresh token returns 401. `skipAuthRetry` prevents this call
   * itself from triggering another refresh attempt if it 401s.
   */
  refresh: (refreshToken: string) =>
    apiClient.post<AuthTokens>(
      "/auth/refresh",
      { refreshToken },
      { skipAuth: true, skipAuthRetry: true }
    ),

  /**
   * Confirmed idempotent (§3): logging out twice, or with an
   * already-invalid refresh token, is a no-op, not an error. Revokes the
   * refresh token server-side; the access token remains cryptographically
   * valid until its own 15-minute expiry regardless (stateless access
   * tokens — a deliberate backend trade-off, not a bug).
   */
  logout: (refreshToken: string) => apiClient.post<void>("/auth/logout", { refreshToken }),
};

// Registers the refresh implementation with the API client's coordinator
// (src/api/refreshCoordinator.ts) — see that file's docstring for why
// this indirection exists instead of a direct import cycle between
// api/client.ts and this file. Registered at module load, before any
// request could need it.
setRefreshHandler(async () => {
  const currentRefreshToken = useAuthStore.getState().refreshToken;
  if (!currentRefreshToken) {
    throw new Error("No refresh token available.");
  }
  return authService.refresh(currentRefreshToken);
});
