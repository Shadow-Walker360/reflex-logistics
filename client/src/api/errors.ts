/**
 * Normalized error categories for the whole app. Every API call funnels its
 * failure through `ApiError` so feature code never has to branch on raw
 * HTTP status codes or fetch's assorted native error shapes (TypeError for
 * network failure, DOMException for abort/timeout, etc).
 *
 * Categories are still derived from HTTP status (below), which is coarser
 * than the backend's own error codes — e.g. both `INVALID_CREDENTIALS` and
 * `AUTHENTICATION_REQUIRED` are HTTP 401 and land in `UNAUTHENTICATED`
 * here. Where a call site needs to distinguish them (e.g. LoginPage
 * needs "wrong credentials" vs. a generic auth failure), it reads the raw
 * backend code off `error.details.code` — see FRONTEND_API_CONTRACT.md §8.
 */

export type ApiErrorCategory =
  | "VALIDATION" // 400
  | "UNAUTHENTICATED" // 401
  | "FORBIDDEN" // 403
  | "NOT_FOUND" // 404
  | "CONFLICT" // 409
  | "BUSINESS_RULE_VIOLATION" // 422 — valid request, violates a domain rule
  | "RATE_LIMITED" // 429
  | "SERVICE_UNAVAILABLE" // 503 — DB/Redis down
  | "SERVER_ERROR" // other 5xx
  | "NETWORK_ERROR" // fetch threw before getting a response
  | "TIMEOUT" // request aborted by the client-side timeout
  | "UNKNOWN"; // anything that doesn't map cleanly — never silently swallowed

export interface ApiErrorDetails {
  /** Raw backend error code, e.g. "INVALID_CREDENTIALS", "VALIDATION_ERROR"
   * (FRONTEND_API_CONTRACT.md §8). This is the authoritative signal for
   * call sites that need finer distinction than the HTTP-status-derived
   * category above provides. */
  code?: string;
  /** UUID from the backend's error envelope — useful for support/debugging
   * correlation, not shown to the user by default. */
  requestId?: string;
  /** Present on some 4xx errors; shape varies per the backend's own
   * documentation ("do not depend on it"). Kept as unknown deliberately —
   * do not assume a per-field map. The backend's 400 validation errors are
   * one semicolon-joined string in `message`, not a field->message map. */
  raw?: unknown;
}

export class ApiError extends Error {
  readonly category: ApiErrorCategory;
  readonly status?: number;
  readonly details?: ApiErrorDetails;

  constructor(
    message: string,
    category: ApiErrorCategory,
    options?: { status?: number; details?: ApiErrorDetails; cause?: unknown }
  ) {
    super(message, { cause: options?.cause });
    this.name = "ApiError";
    this.category = category;
    this.status = options?.status;
    this.details = options?.details;
  }
}

export function categoryForStatus(status: number): ApiErrorCategory {
  switch (status) {
    case 400:
      return "VALIDATION";
    case 401:
      return "UNAUTHENTICATED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 422:
      return "BUSINESS_RULE_VIOLATION";
    case 429:
      return "RATE_LIMITED";
    case 503:
      return "SERVICE_UNAVAILABLE";
    default:
      return status >= 500 ? "SERVER_ERROR" : "UNKNOWN";
  }
}

/** User-facing copy per category — plain language, not raw status codes. */
export const API_ERROR_MESSAGES: Record<ApiErrorCategory, string> = {
  VALIDATION: "Some of the information provided isn't valid. Please review and try again.",
  UNAUTHENTICATED: "Your session has ended. Please log in again.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  CONFLICT: "This was just updated elsewhere. Refreshing the latest information.",
  BUSINESS_RULE_VIOLATION: "That action isn't allowed right now.",
  RATE_LIMITED: "Too many requests right now. Please wait a moment and try again.",
  SERVICE_UNAVAILABLE: "Reflex is temporarily unavailable. Please try again shortly.",
  SERVER_ERROR: "Something went wrong on our end. Please try again shortly.",
  NETWORK_ERROR: "You appear to be offline. Check your connection and try again.",
  TIMEOUT: "That took too long to respond. Please try again.",
  UNKNOWN: "Something unexpected happened. Please try again.",
};
