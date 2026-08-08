import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { ErrorCode } from '../src/common/errors/error-code';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
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

describe('Admin hide / unhide event (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];

  let adminToken: string;
  let organizerToken: string;
  let organizerId: string;
  let buyerToken: string;

  const tag = Date.now();

  async function register(role: 'ATTENDEE' | 'ORGANIZER', label: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-hide-${label}-${tag}@example.com`,
        password: 'password123',
        fullName: `E2E ${label}`,
        role,
      })
      .expect(201);
    userIds.push(res.body.user.id as string);
    return {
      token: res.body.accessToken as string,
      id: res.body.user.id as string,
    };
  }

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** Creates an event and walks it through the real path to PUBLISHED. */
  async function publishEvent(): Promise<{
    eventId: string;
    ticketTypeId: string;
  }> {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerToken))
      .send({
        title: `E2E Hide Concert ${tag}`,
        description: 'An event an admin may have to take down.',
        venue: 'Test Arena',
        city: 'Ha Noi',
        category: 'MUSIC',
        startAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        endAt: new Date(
          Date.now() + 30 * 24 * 3600 * 1000 + 3 * 3600 * 1000,
        ).toISOString(),
      })
      .expect(201);
    const eventId = created.body.id as string;

    const withType = await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/ticket-types`)
      .set(auth(organizerToken))
      .send({ name: 'GA', priceVnd: 200000, quantityTotal: 50 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/publish`)
      .set(auth(organizerToken))
      .expect(200);
    await request(app.getHttpServer())
      .post(`/api/admin/events/${eventId}/approve`)
      .set(auth(adminToken))
      .expect(200);

    return {
      eventId,
      ticketTypeId: withType.body.ticketTypes[0].id as string,
    };
  }

  const hide = (eventId: string, reason: string) =>
    request(app.getHttpServer())
      .post(`/api/admin/events/${eventId}/hide`)
      .set(auth(adminToken))
      .send({ reason });

  const unhide = (eventId: string) =>
    request(app.getHttpServer())
      .post(`/api/admin/events/${eventId}/unhide`)
      .set(auth(adminToken));

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    configureApp(app);
    await app.init();

    const organizer = await register('ORGANIZER', 'org');
    await prisma.user.update({
      where: { id: organizer.id },
      data: { status: 'ACTIVE' },
    });
    organizerToken = organizer.token;
    organizerId = organizer.id;

    buyerToken = (await register('ATTENDEE', 'buyer')).token;

    // ADMIN cannot self-sign-up; register then promote directly.
    const admin = await register('ATTENDEE', 'admin');
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: 'ADMIN' },
    });
    adminToken = admin.token;
  });

  afterAll(async () => {
    if (userIds.length) {
      await prisma.notification.deleteMany({
        where: { userId: { in: userIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { order: { buyerId: { in: userIds } } },
      });
      await prisma.order.deleteMany({ where: { buyerId: { in: userIds } } });
      await prisma.event.deleteMany({
        where: { organizerId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  it('rejects a non-admin role with FORBIDDEN_ROLE', async () => {
    const { eventId } = await publishEvent();

    const res = await request(app.getHttpServer())
      .post(`/api/admin/events/${eventId}/hide`)
      .set(auth(organizerToken))
      .send({ reason: 'Not mine to make' })
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.FORBIDDEN_ROLE);
  });

  it('requires a reason', async () => {
    const { eventId } = await publishEvent();

    const res = await hide(eventId, '   ').expect(400);
    expect(res.body.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it('refuses to hide an event that is not published', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerToken))
      .send({
        title: `E2E Draft ${tag}`,
        description: 'Still a draft.',
        venue: 'Test Arena',
        city: 'Ha Noi',
        category: 'MUSIC',
        startAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
        endAt: new Date(
          Date.now() + 30 * 24 * 3600 * 1000 + 3 * 3600 * 1000,
        ).toISOString(),
      })
      .expect(201);

    const res = await hide(created.body.id as string, 'Too early').expect(409);
    expect(res.body.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
  });

  it('hides the event, clears featured, and cancels its pending orders', async () => {
    const { eventId, ticketTypeId } = await publishEvent();

    await request(app.getHttpServer())
      .patch(`/api/admin/events/${eventId}/featured`)
      .set(auth(adminToken))
      .send({ featured: true })
      .expect(200);

    const order = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({ eventId, items: [{ ticketTypeId, quantity: 1 }] })
      .expect(201);
    const orderId = order.body.id as string;
    expect(order.body.status).toBe('PENDING');

    const hidden = await hide(eventId, 'Nội dung vi phạm quy định').expect(200);
    expect(hidden.body).toMatchObject({
      id: eventId,
      status: 'HIDDEN',
      featured: false,
      hiddenReason: 'Nội dung vi phạm quy định',
    });

    // The held seat is released the moment the event comes down.
    const cancelled = await prisma.order.findUnique({ where: { id: orderId } });
    expect(cancelled?.status).toBe('CANCELLED');

    // Gone from the public surface entirely.
    await request(app.getHttpServer())
      .get(`/api/events/${eventId}`)
      .expect(404);
    const list = await request(app.getHttpServer())
      .get('/api/events')
      .expect(200);
    expect(
      (list.body as { id: string }[]).some((event) => event.id === eventId),
    ).toBe(false);

    // And unbookable.
    const blocked = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({ eventId, items: [{ ticketTypeId, quantity: 1 }] })
      .expect(409);
    expect(blocked.body.code).toBe(ErrorCode.EVENT_NOT_PURCHASABLE);

    const notification = await prisma.notification.findFirst({
      where: { userId: organizerId, type: 'EVENT_HIDDEN' },
      orderBy: { createdAt: 'desc' },
    });
    expect(notification?.data).toMatchObject({
      eventId,
      reason: 'Nội dung vi phạm quy định',
    });
  });

  it('lets the organizer pull a hidden event back to draft', async () => {
    const { eventId } = await publishEvent();
    await hide(eventId, 'Ảnh bìa sai bản quyền').expect(200);

    const back = await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/unpublish`)
      .set(auth(organizerToken))
      .expect(200);
    expect(back.body.status).toBe('DRAFT');

    // Once the organizer has taken it back, unhide no longer applies.
    const res = await unhide(eventId).expect(409);
    expect(res.body.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
  });

  it('restores a hidden event unfeatured and clears the reason', async () => {
    const { eventId } = await publishEvent();
    await hide(eventId, 'Chờ xác minh giấy phép').expect(200);

    const restored = await unhide(eventId).expect(200);
    expect(restored.body).toMatchObject({
      id: eventId,
      status: 'PUBLISHED',
      featured: false,
      hiddenReason: null,
    });

    await request(app.getHttpServer())
      .get(`/api/events/${eventId}`)
      .expect(200);

    const notification = await prisma.notification.findFirst({
      where: { userId: organizerId, type: 'EVENT_UNHIDDEN' },
      orderBy: { createdAt: 'desc' },
    });
    expect(notification?.data).toMatchObject({ eventId });

    // Restoring twice is a conflict, not a silent no-op.
    const again = await unhide(eventId).expect(409);
    expect(again.body.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
  });

  it('returns NOT_FOUND for an unknown event', async () => {
    const res = await hide(
      '00000000-0000-7000-8000-000000000000',
      'Ghost',
    ).expect(404);
    expect(res.body.code).toBe(ErrorCode.NOT_FOUND);
  });
});
