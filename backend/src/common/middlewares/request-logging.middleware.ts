import { NextFunction, Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

const ANSI_RESET = '\u001b[0m';
const ANSI_GREEN = '\u001b[32m';
const ANSI_CYAN = '\u001b[36m';
const ANSI_YELLOW = '\u001b[33m';
const ANSI_RED = '\u001b[31m';

function colorStatusCode(statusCode: number): string {
  if (process.env.NODE_ENV === 'production') {
    return String(statusCode);
  }

  if (statusCode >= 500) {
    return `${ANSI_RED}${statusCode}${ANSI_RESET}`;
  }

  if (statusCode >= 400) {
    return `${ANSI_YELLOW}${statusCode}${ANSI_RESET}`;
  }

  if (statusCode >= 300) {
    return `${ANSI_CYAN}${statusCode}${ANSI_RESET}`;
  }

  return `${ANSI_GREEN}${statusCode}${ANSI_RESET}`;
}

export function createRequestLoggingMiddleware(logger: PinoLogger) {
  logger.setContext('HTTP');

  return (request: Request, response: Response, next: NextFunction): void => {
    const startedAt = Date.now();
    const requestId = request.header('x-request-id');
    const logContext = {
      requestId,
      method: request.method,
      url: request.originalUrl || request.url,
    };

    logger.info(logContext, 'Request received:');

    response.on('finish', () => {
      const statusCode = response.statusCode;
      const responseTimeMs = Date.now() - startedAt;

      logger.info(
        {
          ...logContext,
          statusCode,
          responseTimeMs,
        },
        `Request completed: ${request.method} ${request.originalUrl || request.url} ${colorStatusCode(statusCode)} ${responseTimeMs}ms`,
      );
    });

    next();
  };
}
