import { randomUUID } from 'node:crypto';
import { IncomingMessage } from 'node:http';
import { Params } from 'nestjs-pino';

function getRequestId(request: IncomingMessage): string {
  const requestId = request.headers['x-request-id'];

  if (Array.isArray(requestId)) {
    return requestId[0] ?? randomUUID();
  }

  return requestId ?? randomUUID();
}

export function createLoggerModuleOptions(nodeEnv = 'development'): Params {
  const isProduction = nodeEnv === 'production';

  return {
    pinoHttp: {
      level: isProduction ? 'info' : 'debug',
      autoLogging: true,
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:standard',
            },
          },
      genReqId: getRequestId,
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-api-key"]',
        ],
        censor: '[Redacted]',
      },
    },
  };
}
