import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger, PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { createRequestLoggingMiddleware } from './common/middlewares/request-logging.middleware';
import { ErrorCode } from './common/errors/error-code';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService);
  app.useLogger(app.get(Logger));
  const httpLogger = await app.resolve(PinoLogger);
  app.use(createRequestLoggingMiddleware(httpLogger));

  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get<string>('frontendUrl') ?? '*' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Request validation failed.',
        fields: errors.map((error) => ({
          field: error.property,
          rule: Object.keys(error.constraints ?? {})[0] ?? 'unknown',
        })),
      }),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Event Ticketing API')
    .setDescription('API for the multi-platform event ticketing system')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('port') ?? 3000;
  await app.listen(port);
}
void bootstrap();
