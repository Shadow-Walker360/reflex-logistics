import { apiClient } from "@/api/client";
import type { User } from "@/types";

/**
 * PROVISIONAL. Endpoint paths and payload shape are a reasonable guess at
 * a NestJS auth module's surface, not a confirmed contract. The actual
 * mechanism (password vs OTP vs both) is an open question — see
 * client/README.md "Backend Dependencies / API Questions". Update this
 * file (not call sites) once the backend contract is confirmed.
 */

export interface LoginCredentials {
  identifier: string; // phone or email — mechanism not yet confirmed
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export const authService = {
  login: (credentials: LoginCredentials) =>
    apiClient.post<LoginResponse>("/auth/login", credentials, { skipAuth: true }),

  logout: () => apiClient.post<void>("/auth/logout"),

  /** Re-validate the current session, e.g. on app load or after a refresh. */
  getSession: () => apiClient.get<{ user: User }>("/auth/session"),
};
