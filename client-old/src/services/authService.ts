import { apiClient } from "@/api/client";
import { setRefreshHandler } from "@/api/refreshCoordinator";
import { useAuthStore } from "@/state/authStore";
import type { User } from "@/types";

/**
 * Endpoint paths below are aligned to the published contract
 * (FULL_SCALE_DELIVERY_DIRECTIVE.md §8, confirmed 2026-08-29):
 *   POST /auth/login
 *   POST /auth/refresh
 *   POST /auth/logout
 *   GET  /auth/me
 *
 * Payload SHAPES (fields, exact types) are still not backed by a real
 * OpenAPI spec — the backend has no executable implementation yet (see
 * client/README.md §12 and docs/api-contract.md, which is the frontend's
 * proposal for what those shapes should be, per the directive's
 * instruction that "frontend engineers should expose the exact API
 * calls and expected DTOs from the existing UI"). Update this file (not
 * call sites) once a real OpenAPI spec supersedes docs/api-contract.md.
 */

export interface LoginCredentials {
  identifier: string; // phone or email — mechanism not yet confirmed
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

/**
 * PROPOSED — not in the directive's §8 endpoint list at all. See
 * signupSchema.ts for the tenancy reasoning behind the shape: a Retailer
 * signup creates a tenant (businessName); Dispatcher/Rider signup joins
 * one via a backend-validated invite code (organizationCode) — the
 * frontend never sends or asserts a raw tenant ID.
 */
export type SignupRequest =
  | { role: "RETAILER"; name: string; identifier: string; password: string; businessName: string }
  | { role: "DISPATCHER"; name: string; identifier: string; password: string; organizationCode: string }
  | { role: "RIDER"; name: string; identifier: string; password: string; organizationCode: string };

export interface SignupResponse extends AuthTokens {
  user: User;
}

export const authService = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<LoginResponse>("/auth/login", credentials, { skipAuth: true }),

  /**
   * Proposed endpoint (not in directive §8 — see docs/api-contract.md).
   * Assumes auto-login on success (returns tokens + user), same as
   * /auth/login. An email/phone verification step before first login is
   * a realistic requirement this does NOT implement — flagged as an open
   * question rather than silently assumed away.
   */
  register: (payload: SignupRequest) =>
    apiClient.post<SignupResponse>("/auth/register", payload, { skipAuth: true }),

  /**
   * Exchanges a refresh token for a new access/refresh token pair
   * (directive §4: "refresh-token lifecycle"; §11 flags DB-backed hashed
   * refresh tokens as the assumed model, implying rotation). The frontend
   * always stores whatever refreshToken comes back and never reuses an
   * old one. `skipAuthRetry` prevents this call itself from triggering
   * another refresh attempt if it 401s.
   */
  refresh: (refreshToken: string) =>
    apiClient.post<AuthTokens>(
      "/auth/refresh",
      { refreshToken },
      { skipAuth: true, skipAuthRetry: true }
    ),

  logout: () => apiClient.post<void>("/auth/logout"),

  /** Session bootstrap / "who am I" check — GET /auth/me per the directive. */
  getCurrentUser: () => apiClient.get<{ user: User }>("/auth/me"),
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
