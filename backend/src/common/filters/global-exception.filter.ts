import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppErrorCode } from '../errors/app-error-codes';
import { AppException } from '../errors/app.exception';

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    requestId: string;
    details?: unknown;
  };
}

/**
 * Global exception filter — the single place that turns any thrown error
 * into the standard API error envelope described in the specification,
 * Section 27 (Error Handling):
 *
 *   { "error": { "code", "message", "requestId" } }
 *
 * Guarantees:
 *  - Every error response has the same shape, regardless of where it
 *    originated (validation pipe, guard, domain code, unexpected exception).
 *  - Stack traces, raw database errors, and internal details are never
 *    sent to the client.
 *  - A requestId is always present so a client-reported error can be
 *    correlated with server logs (see RequestIdMiddleware).
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = (request as any).id || 'unknown';

    const { status, code, message, details } = this.resolve(exception);

    // Never leak internals for 5xx — log the real error server-side instead.
    if (status >= 500) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${requestId}] ${request.method} ${request.url} -> ${status} (${code})`,
      );
    }

    const envelope: ErrorEnvelope = {
      error: {
        code,
        message,
        requestId,
        ...(details !== undefined && status < 500 ? { details } : {}),
      },
    };

    response.status(status).json(envelope);
  }

  private resolve(exception: unknown): {
    status: number;
    code: string;
    message: string;
    details?: unknown;
  } {
    if (exception instanceof AppException) {
      const body = exception.getResponse() as {
        message: string;
        details?: unknown;
      };
      return {
        status: exception.getStatus(),
        code: exception.code,
        message: body.message,
        details: body.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // class-validator ValidationPipe throws a 400 HttpException whose
      // response body is { message: string[] | string, ... }. Normalize it
      // into our envelope shape rather than passing Nest's default shape
      // straight through.
      const message =
        typeof body === 'string'
          ? body
          : Array.isArray((body as any)?.message)
            ? (body as any).message.join('; ')
            : (body as any)?.message || exception.message;

      return {
        status,
        code: this.codeForStatus(status),
        message,
      };
    }

    // Anything else is an unexpected, unhandled error — a bug, not a
    // business-rule outcome. Never expose exception.message to the client
    // for these, since it may contain internal details (e.g. a raw
    // database driver error message).
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: AppErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred.',
    };
  }

  private codeForStatus(status: number): string {
    switch (status) {
      case 400:
        return AppErrorCode.VALIDATION_ERROR;
      case 401:
        return AppErrorCode.AUTHENTICATION_REQUIRED;
      case 403:
        return AppErrorCode.FORBIDDEN;
      case 404:
        return AppErrorCode.NOT_FOUND;
      case 409:
        return AppErrorCode.CONFLICT;
      case 422:
        return AppErrorCode.BUSINESS_RULE_VIOLATION;
      case 429:
        return AppErrorCode.RATE_LIMITED;
      case 503:
        return AppErrorCode.DEPENDENCY_UNAVAILABLE;
      default:
        return AppErrorCode.INTERNAL_ERROR;
    }
  }
}
