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
 *  - base URL from env (never hardcoded — see src/config/env.ts). Per
 *    FRONTEND_API_CONTRACT.md §1, the confirmed base is
 *    http://localhost:3000/api/v1 — the backend fixes the `api` prefix and
 *    `v1` version segment; only host/port vary by environment.
 *  - auth header injection (Bearer token; JWT access + refresh, 15-minute
 *    access token expiry, confirmed per FRONTEND_API_CONTRACT.md §7)
 *  - a single silent-refresh attempt on 401 before giving up (see below)
 *  - timeout handling
 *  - consistent error normalization into ApiError, parsed from the
 *    confirmed { error: { code, message, requestId } } envelope (§8)
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
  // BUG FIX: `new URL(path, base)` treats a leading "/" in `path` as
  // absolute-from-origin — it discards everything in `base`'s own path
  // (including /api/v1) and resolves against the bare origin instead.
  // e.g. new URL("/deliveries", "http://localhost:3000/api/v1/") produces
  // "http://localhost:3000/deliveries", silently dropping /api/v1. This
  // was wrong from the very first version of this client and went
  // undetected because nothing asserted the final URL string until
  // tests/api/client.test.ts did. The fix: strip the leading slash from
  // `path` so URL resolution treats it as relative to the full base path,
  // not just the origin.
  const relativePath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(
    relativePath,
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

/**
 * Parses the backend's actual error envelope (FRONTEND_API_CONTRACT.md §8):
 *   { error: { code, message, requestId, details? } }
 * NOT the previously-assumed { message, code, fields } flat shape — that
 * was a guess made before a real contract existed and was wrong. If the
 * body doesn't match this shape (e.g. a proxy/gateway error page), every
 * field below comes back undefined and the caller falls back to a
 * status-derived message rather than throwing a second error here.
 */
async function parseErrorBody(
  response: Response
): Promise<{ message?: string; code?: string; requestId?: string; raw?: unknown }> {
  try {
    const data = await response.json();
    const error = data && typeof data === "object" ? data.error : undefined;
    if (error && typeof error === "object") {
      return {
        message: typeof error.message === "string" ? error.message : undefined,
        code: typeof error.code === "string" ? error.code : undefined,
        requestId: typeof error.requestId === "string" ? error.requestId : undefined,
        raw: error.details,
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
      details: { code: errorBody.code, requestId: errorBody.requestId, raw: errorBody.raw },
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
