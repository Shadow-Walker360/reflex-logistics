import { HttpException } from '@nestjs/common';
import { AppErrorCode, APP_ERROR_HTTP_STATUS } from './app-error-codes';

/**
 * The exception type domain and application services should throw for any
 * expected, named failure (as opposed to a genuine bug, which should be an
 * unhandled error caught by the global filter and reported as 500).
 *
 * Example:
 *   throw new AppException(
 *     AppErrorCode.CONFLICT,
 *     'This delivery is no longer assignable.',
 *   );
 */
export class AppException extends HttpException {
  public readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super({ code, message, details }, APP_ERROR_HTTP_STATUS[code]);
    this.code = code;
  }
}
