/**
 * Normalized error categories for the whole app. Every API call funnels its
 * failure through `ApiError` so feature code never has to branch on raw
 * HTTP status codes or fetch's assorted native error shapes (TypeError for
 * network failure, DOMException for abort/timeout, etc).
 */

export type ApiErrorCategory =
  | "VALIDATION" // 400
  | "UNAUTHENTICATED" // 401
  | "FORBIDDEN" // 403
  | "NOT_FOUND" // 404
  | "CONFLICT" // 409
  | "RATE_LIMITED" // 429
  | "SERVER_ERROR" // 5xx
  | "NETWORK_ERROR" // fetch threw before getting a response
  | "TIMEOUT" // request aborted by the client-side timeout
  | "UNKNOWN"; // anything that doesn't map cleanly — never silently swallowed

export interface ApiErrorDetails {
  /** Field-level validation messages, when the backend provides them. */
  fields?: Record<string, string>;
  /** Raw backend error code/slug, if any, for logging/debugging. */
  code?: string;
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
    case 429:
      return "RATE_LIMITED";
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
  RATE_LIMITED: "Too many requests right now. Please wait a moment and try again.",
  SERVER_ERROR: "Something went wrong on our end. Please try again shortly.",
  NETWORK_ERROR: "You appear to be offline. Check your connection and try again.",
  TIMEOUT: "That took too long to respond. Please try again.",
  UNKNOWN: "Something unexpected happened. Please try again.",
};
