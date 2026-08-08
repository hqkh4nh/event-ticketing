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

/**
 * Mirrors the production bootstrap in main.ts so validation and error shapes
 * match what a real client sees.
 */
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

describe('Admin event detail (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];

  let adminToken: string;
  let organizerToken: string;
  let organizerId: string;
  let attendeeToken: string;
  let attendeeId: string;

  const tag = Date.now();
  let transferCodeSeq = 0;

  async function register(role: 'ATTENDEE' | 'ORGANIZER', label: string) {
    const email = `e2e-ae-${label}-${tag}@example.com`;
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'password123', fullName: `E2E ${label}`, role })
      .expect(201);
    userIds.push(res.body.user.id as string);
    return {
      token: res.body.accessToken as string,
      id: res.body.user.id as string,
    };
  }

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  /** Builds an event still waiting for review, with one paid ticket sold. */
  async function seedReviewableEvent() {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerToken))
      .send({
        title: 'E2E Admin Detail Concert',
        description: 'Full description the admin should be able to read.',
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
    const ticketTypeId = withType.body.ticketTypes[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/publish`)
      .set(auth(organizerToken))
      .expect(200);

    // A settled sale, so revenue and sold counts have something to report.
    const order = await prisma.order.create({
      data: {
        buyerId: attendeeId,
        eventId,
        status: 'PAID',
        totalVnd: 400000n,
        transferCode: `E2EAE${tag}${transferCodeSeq++}`,
        expiresAt: new Date(Date.now() + 3600 * 1000),
        paidAt: new Date(),
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        eventId,
        ticketTypeId,
        quantity: 2,
        unitPriceVnd: 200000n,
      },
    });

    return eventId;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    configureApp(app);
    await app.init();

    const attendee = await register('ATTENDEE', 'attendee');
    attendeeToken = attendee.token;
    attendeeId = attendee.id;

    const organizer = await register('ORGANIZER', 'org');
    await prisma.user.update({
      where: { id: organizer.id },
      data: { status: 'ACTIVE' },
    });
    organizerToken = organizer.token;
    organizerId = organizer.id;

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
      await prisma.order.deleteMany({ where: { buyerId: { in: userIds } } });
      await prisma.event.deleteMany({
        where: { organizerId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  it('rejects a non-admin role with FORBIDDEN_ROLE', async () => {
    const eventId = await seedReviewableEvent();

    const res = await request(app.getHttpServer())
      .get(`/api/admin/events/${eventId}`)
      .set(auth(organizerToken))
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.FORBIDDEN_ROLE);
  });

  it('returns full detail for an event still awaiting review', async () => {
    const eventId = await seedReviewableEvent();

    // The public endpoint cannot serve this event, which is why admin needs one.
    await request(app.getHttpServer())
      .get(`/api/events/${eventId}`)
      .expect(404);

    const res = await request(app.getHttpServer())
      .get(`/api/admin/events/${eventId}`)
      .set(auth(adminToken))
      .expect(200);

    expect(res.body).toMatchObject({
      id: eventId,
      organizerId,
      status: 'PENDING_REVIEW',
      title: 'E2E Admin Detail Concert',
      description: 'Full description the admin should be able to read.',
      city: 'Ha Noi',
      category: 'MUSIC',
      sold: 2,
      capacity: 50,
      revenueVnd: 400000,
      checkedInCount: 0,
    });
    expect(res.body.organizerEmail).toContain('e2e-ae-org-');
    expect(res.body.ticketTypes).toHaveLength(1);
    expect(res.body.ticketTypes[0]).toMatchObject({
      name: 'GA',
      priceVnd: 200000,
      quantityTotal: 50,
      soldCount: 2,
    });
  });

  it('returns NOT_FOUND for an unknown event', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/events/00000000-0000-7000-8000-000000000000')
      .set(auth(adminToken))
      .expect(404);
    expect(res.body.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/events/00000000-0000-7000-8000-000000000000')
      .expect(401);
  });

  it('leaves the attendee role out too', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/events/00000000-0000-7000-8000-000000000000')
      .set(auth(attendeeToken))
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.FORBIDDEN_ROLE);
  });
});
