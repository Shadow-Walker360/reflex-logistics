import { AppErrorCode, APP_ERROR_HTTP_STATUS } from '../app-error-codes';

describe('APP_ERROR_HTTP_STATUS', () => {
  it('has an HTTP status mapping for every AppErrorCode', () => {
    const codes = Object.values(AppErrorCode);
    for (const code of codes) {
      expect(APP_ERROR_HTTP_STATUS[code]).toBeDefined();
      expect(typeof APP_ERROR_HTTP_STATUS[code]).toBe('number');
    }
  });

  it('matches the exact status codes enumerated in spec Section 27', () => {
    expect(APP_ERROR_HTTP_STATUS[AppErrorCode.VALIDATION_ERROR]).toBe(400);
    expect(APP_ERROR_HTTP_STATUS[AppErrorCode.AUTHENTICATION_REQUIRED]).toBe(
      401,
    );
    expect(APP_ERROR_HTTP_STATUS[AppErrorCode.FORBIDDEN]).toBe(403);
    expect(APP_ERROR_HTTP_STATUS[AppErrorCode.NOT_FOUND]).toBe(404);
    expect(APP_ERROR_HTTP_STATUS[AppErrorCode.CONFLICT]).toBe(409);
    expect(APP_ERROR_HTTP_STATUS[AppErrorCode.BUSINESS_RULE_VIOLATION]).toBe(
      422,
    );
    expect(APP_ERROR_HTTP_STATUS[AppErrorCode.RATE_LIMITED]).toBe(429);
    expect(APP_ERROR_HTTP_STATUS[AppErrorCode.DEPENDENCY_UNAVAILABLE]).toBe(
      503,
    );
    expect(APP_ERROR_HTTP_STATUS[AppErrorCode.INTERNAL_ERROR]).toBe(500);
  });
});
