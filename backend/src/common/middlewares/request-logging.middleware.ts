import { NextFunction, Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

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

    logger.info(logContext, 'request received');

    response.on('finish', () => {
      logger.info(
        {
          ...logContext,
          statusCode: response.statusCode,
          responseTimeMs: Date.now() - startedAt,
        },
        'request completed',
      );
    });

    next();
  };
}
