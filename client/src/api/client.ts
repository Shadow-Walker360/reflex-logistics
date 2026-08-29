import { env } from "@/config/env";
import { getAuthToken } from "@/state/authStore";
import { ApiError, categoryForStatus } from "./errors";

/**
 * The single HTTP boundary for the whole app. `services/*.ts` are the only
 * callers of this module — components and hooks never call it directly and
 * never call `fetch` themselves (see README "API integration rules").
 *
 * Responsibilities:
 *  - base URL from env (never hardcoded — see src/config/env.ts)
 *  - auth header injection (boundary only; the actual token/refresh
 *    mechanism depends on a backend contract that isn't finalized yet —
 *    see README "Backend Dependencies")
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

/**
 * Core request function. Never called directly outside this file —
 * `apiClient.get/post/patch/delete` below are the public surface.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, timeoutMs = env.apiTimeoutMs, skipAuth = false, signal } = options;

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
    // Auth header injection boundary. The scheme (Bearer vs. cookie-based
    // session) is a BACKEND DEPENDENCY — see README. This assumes Bearer
    // as the placeholder until that's confirmed.
    const token = getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
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
