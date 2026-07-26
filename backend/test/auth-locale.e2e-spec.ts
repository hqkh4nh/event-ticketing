import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';

import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ErrorCode } from '../src/common/errors/error-code';
import { PrismaService } from '../src/prisma/prisma.service';

function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
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
}

describe('Account locale (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];
  const tag = Date.now();

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const password = 'password123';

  async function register(
    label: string,
    locale?: 'vi' | 'en',
  ): Promise<{ token: string; id: string; body: Record<string, any> }> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-locale-${label}-${tag}@example.com`,
        password,
        fullName: `E2E ${label}`,
        ...(locale ? { locale } : {}),
      })
      .expect(201);
    userIds.push(res.body.user.id as string);
    return {
      token: res.body.accessToken as string,
      id: res.body.user.id as string,
      body: res.body as Record<string, any>,
    };
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    if (userIds.length) {
      await prisma.notification.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  it('defaults a new account to Vietnamese', async () => {
    const { token, body } = await register('default');
    expect(body.user.locale).toBe('vi');

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(auth(token))
      .expect(200);
    expect(me.body.locale).toBe('vi');
  });

  it('stores the locale sent at registration and returns it when signing in', async () => {
    const { body } = await register('english', 'en');
    expect(body.user.locale).toBe('en');

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: `e2e-locale-english-${tag}@example.com`, password })
      .expect(200);
    expect(login.body.user.locale).toBe('en');
  });

  it('updates the locale through PATCH /auth/me', async () => {
    const { token } = await register('patch');

    const patched = await request(app.getHttpServer())
      .patch('/api/auth/me')
      .set(auth(token))
      .send({ locale: 'en' })
      .expect(200);
    expect(patched.body.locale).toBe('en');

    const me = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set(auth(token))
      .expect(200);
    expect(me.body.locale).toBe('en');
  });

  it('rejects an unsupported locale', async () => {
    const { token } = await register('invalid');

    const res = await request(app.getHttpServer())
      .patch('/api/auth/me')
      .set(auth(token))
      .send({ locale: 'fr' })
      .expect(400);
    expect(res.body.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it('requires a session to change the locale', async () => {
    await request(app.getHttpServer())
      .patch('/api/auth/me')
      .send({ locale: 'en' })
      .expect(401);
  });
});
