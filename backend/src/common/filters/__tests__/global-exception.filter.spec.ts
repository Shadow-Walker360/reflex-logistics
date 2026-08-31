import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { GlobalExceptionFilter } from '../global-exception.filter';
import { AppException } from '../../errors/app.exception';
import { AppErrorCode } from '../../errors/app-error-codes';

/**
 * These tests exist to lock in the contract described in the spec,
 * Section 27 (Error Handling): every error response has the same shape,
 * carries a requestId, and never leaks internals for 5xx errors.
 */
describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new GlobalExceptionFilter();
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    const request = { id: 'req-123', method: 'GET', url: '/api/v1/deliveries' };
    const response = { status: statusMock };

    host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
  });

  it('maps an AppException(CONFLICT) to a 409 with the standard envelope', () => {
    const exception = new AppException(
      AppErrorCode.CONFLICT,
      'This delivery is no longer assignable.',
    );

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(409);
    expect(jsonMock).toHaveBeenCalledWith({
      error: {
        code: AppErrorCode.CONFLICT,
        message: 'This delivery is no longer assignable.',
        requestId: 'req-123',
      },
    });
  });

  it('maps AppErrorCode.BUSINESS_RULE_VIOLATION to HTTP 422', () => {
    const exception = new AppException(
      AppErrorCode.BUSINESS_RULE_VIOLATION,
      'Invalid state transition.',
    );

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(422);
  });

  it('normalizes a class-validator ValidationPipe 400 into the standard envelope', () => {
    const exception = new BadRequestException({
      message: ['email must be an email', 'password should not be empty'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(400);
    const payload = jsonMock.mock.calls[0][0];
    expect(payload.error.code).toBe(AppErrorCode.VALIDATION_ERROR);
    expect(payload.error.message).toContain('email must be an email');
    expect(payload.error.requestId).toBe('req-123');
  });

  it('never leaks the original error message for an unexpected exception (5xx)', () => {
    const exception = new Error(
      'password authentication failed for user "reflex" at db.internal:5432',
    );

    filter.catch(exception, host);

    expect(statusMock).toHaveBeenCalledWith(500);
    const payload = jsonMock.mock.calls[0][0];
    expect(payload.error.code).toBe(AppErrorCode.INTERNAL_ERROR);
    expect(payload.error.message).not.toContain('db.internal');
    expect(payload.error.message).not.toContain(
      'password authentication failed',
    );
  });

  it('falls back to "unknown" requestId if the middleware did not run', () => {
    const request = { method: 'GET', url: '/api/v1/deliveries' }; // no .id
    const response = { status: statusMock };
    const hostWithoutId = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(new Error('boom'), hostWithoutId);

    const payload = jsonMock.mock.calls[0][0];
    expect(payload.error.requestId).toBe('unknown');
  });
});
