import { env } from "@/config/env";
import { getAuthToken, getRefreshToken, useAuthStore } from "@/state/authStore";
import { ApiError, categoryForStatus } from "./errors";
import { performRefresh } from "./refreshCoordinator";

/**
 * The single HTTP boundary for the whole app. `services/*.ts` are the only
 * callers of this module — components and hooks never call it directly and
 * never call `fetch` themselves (see README "API integration rules").
 *
 * Responsibilities:
 *  - base URL from env (never hardcoded — see src/config/env.ts)
 *  - auth header injection (Bearer token; scheme confirmed as JWT access +
 *    refresh per FULL_SCALE_DELIVERY_DIRECTIVE.md §11, payload/claims TBD)
 *  - a single silent-refresh attempt on 401 before giving up (see below)
 *  - timeout handling
 *  - consistent error normalization into ApiError
 *  - typed JSON responses
 */

export type QueryParamValue = string | number | boolean | undefined | null;

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryParamValue>;
  /** Override the default timeout for this one request. */
  timeoutMs?: number;
  /** Skip auth header injection (e.g. for the login call itself). */
  skipAuth?: boolean;
  /** Skip the automatic 401→refresh→retry dance — used by refresh/login
   * themselves so a failing refresh call doesn't try to refresh itself. */
  skipAuthRetry?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Record<string, QueryParamValue>): string {
  const url = new URL(
    path.startsWith("/") ? path : `/${path}`,
    // URL requires an absolute base; apiBaseUrl is expected absolute
    // (e.g. http://localhost:3000/api) per .env.example.
    env.apiBaseUrl.endsWith("/") ? env.apiBaseUrl : `${env.apiBaseUrl}/`
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function parseErrorBody(response: Response): Promise<{ message?: string; code?: string; fields?: Record<string, string> }> {
  try {
    const data = await response.json();
    if (data && typeof data === "object") {
      return {
        message: typeof data.message === "string" ? data.message : undefined,
        code: typeof data.code === "string" ? data.code : undefined,
        fields: typeof data.fields === "object" ? data.fields : undefined,
      };
    }
  } catch {
    // Response body wasn't JSON (or was empty) — fall through to a
    // status-derived message instead of throwing a second error here.
  }
  return {};
}

async function performFetch(url: string, method: string, headers: Record<string, string>, body: unknown, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });
}

/**
 * Core request function. Never called directly outside this file —
 * `apiClient.get/post/patch/delete` below are the public surface.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    body,
    query,
    timeoutMs = env.apiTimeoutMs,
    skipAuth = false,
    skipAuthRetry = false,
    signal,
  } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  // If the caller also passed a signal (e.g. React Query's), abort ours
  // when theirs aborts too, so callers can still cancel in-flight requests.
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (!skipAuth) {
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const url = buildUrl(path, query);

  let response: Response;
  try {
    response = await performFetch(url, method, headers, body, controller.signal);
  } catch (cause) {
    clearTimeout(timeout);
    if (controller.signal.aborted) {
      throw new ApiError("Request timed out.", "TIMEOUT", { cause });
    }
    throw new ApiError("Network request failed.", "NETWORK_ERROR", { cause });
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const errorBody = await parseErrorBody(response);
    const category = categoryForStatus(response.status);

    // Single silent-refresh-and-retry on 401 (directive §4: "refresh-token
    // lifecycle"). Skipped for calls that opted out (login/refresh itself,
    // to avoid an infinite loop) and for anything with no refresh token to
    // spend. Only ever retried once per original call — if the retried
    // request also 401s, that failure is returned as-is rather than
    // looping.
    if (category === "UNAUTHENTICATED" && !skipAuth && !skipAuthRetry) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const tokens = await performRefresh();
          useAuthStore.getState().setTokens(tokens);
          return request<T>(path, { ...options, skipAuthRetry: true });
        } catch {
          // Refresh itself failed — the session is genuinely over.
          useAuthStore.getState().clearSession();
        }
      }
    }

    throw new ApiError(errorBody.message ?? `Request failed with status ${response.status}.`, category, {
      status: response.status,
      details: { code: errorBody.code, fields: errorBody.fields },
    });
  }

  if (response.status === 204) {
    return undefined as T;
  }

  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new ApiError("Received an unreadable response from the server.", "UNKNOWN", { cause });
  }
}

export const apiClient = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PATCH", body }),
  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "PUT", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    request<T>(path, { ...options, method: "DELETE" }),
};
