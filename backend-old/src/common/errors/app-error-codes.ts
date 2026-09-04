/**
 * Central registry of application error codes.
 *
 * Spec reference: BACKEND ENGINEERING SPECIFICATION, Section 27 (Error Handling).
 *
 * HTTP status codes tell the client *how* to react (retry, fix input, re-auth).
 * These codes tell the client (and us, in logs) exactly *what* happened.
 * New codes are added here as new domains are implemented — do not invent
 * ad-hoc string literals at the call site.
 */
export enum AppErrorCode {
  // Generic / cross-cutting
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  RATE_LIMITED = 'RATE_LIMITED',
  DEPENDENCY_UNAVAILABLE = 'DEPENDENCY_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Maps an AppErrorCode to its canonical HTTP status.
 * Kept as a lookup (not scattered `throw new HttpException(...)` calls)
 * so the mapping in Section 27 of the spec is enforced in exactly one place.
 */
export const APP_ERROR_HTTP_STATUS: Record<AppErrorCode, number> = {
  [AppErrorCode.VALIDATION_ERROR]: 400,
  [AppErrorCode.AUTHENTICATION_REQUIRED]: 401,
  [AppErrorCode.INVALID_CREDENTIALS]: 401,
  [AppErrorCode.FORBIDDEN]: 403,
  [AppErrorCode.NOT_FOUND]: 404,
  [AppErrorCode.CONFLICT]: 409,
  [AppErrorCode.BUSINESS_RULE_VIOLATION]: 422,
  [AppErrorCode.RATE_LIMITED]: 429,
  [AppErrorCode.DEPENDENCY_UNAVAILABLE]: 503,
  [AppErrorCode.INTERNAL_ERROR]: 500,
};
