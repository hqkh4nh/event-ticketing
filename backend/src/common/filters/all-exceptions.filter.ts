import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

import { ErrorCode } from '../errors/error-code';

const FALLBACK_CODE: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: ErrorCode.VALIDATION_FAILED,
  [HttpStatus.UNAUTHORIZED]: ErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ErrorCode.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorCode.CONFLICT,
};

type ErrorBody = { code?: string; message?: unknown; fields?: unknown };

/**
 * Catches every unhandled exception and returns a consistent JSON error shape.
 * 5xx errors are logged with their stack; 4xx are passed through as-is.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const raw =
      exception instanceof HttpException ? exception.getResponse() : null;
    const body: ErrorBody = raw !== null && typeof raw === 'object' ? raw : {};

    const code = body.code ?? FALLBACK_CODE[status] ?? ErrorCode.INTERNAL_ERROR;

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const message =
      status >= 500
        ? 'Internal server error.'
        : typeof body.message === 'string'
          ? body.message
          : typeof raw === 'string'
            ? raw
            : 'Request failed.';

    response.status(status).json({
      statusCode: status,
      path: request.url,
      code,
      message,
      ...(body.fields ? { fields: body.fields } : {}),
    });
  }
}
