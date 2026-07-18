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

const futureEvent = () => ({
  title: 'E2E Concert',
  description: 'A test event.',
  venue: 'Test Arena',
  city: 'Ha Noi',
  category: 'MUSIC',
  startAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  endAt: new Date(
    Date.now() + 30 * 24 * 3600 * 1000 + 3 * 3600 * 1000,
  ).toISOString(),
});

describe('Organizer events (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];

  let organizerAToken: string;
  let organizerBToken: string;
  let attendeeToken: string;
  let pendingOrganizerToken: string;

  const tag = Date.now();

  async function register(role: 'ATTENDEE' | 'ORGANIZER', label: string) {
    const email = `e2e-${label}-${tag}@example.com`;
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

    const organizerA = await register('ORGANIZER', 'orga');
    const organizerB = await register('ORGANIZER', 'orgb');
    const pending = await register('ORGANIZER', 'pending');
    pendingOrganizerToken = pending.token;

    // Simulate admin approval (out of this slice): activate the two working organizers.
    await prisma.user.updateMany({
      where: { id: { in: [organizerA.id, organizerB.id] } },
      data: { status: 'ACTIVE' },
    });
    organizerAToken = organizerA.token;
    organizerBToken = organizerB.token;
  });

  afterAll(async () => {
    if (userIds.length) {
      await prisma.event.deleteMany({
        where: { organizerId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('rejects a non-organizer role with FORBIDDEN_ROLE', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/organizer/events')
      .set(auth(attendeeToken))
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.FORBIDDEN_ROLE);
  });

  it('rejects a pending organizer with ACCOUNT_PENDING_APPROVAL', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/organizer/events')
      .set(auth(pendingOrganizerToken))
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.ACCOUNT_PENDING_APPROVAL);
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer()).get('/api/organizer/events').expect(401);
  });

  it('creates an event in DRAFT', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerAToken))
      .send(futureEvent())
      .expect(201);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.ticketTypes).toEqual([]);
  });

  it('rejects an event whose startAt is not before endAt', async () => {
    const bad = futureEvent();
    bad.endAt = bad.startAt;
    const res = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerAToken))
      .send(bad)
      .expect(400);
    expect(res.body.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it('refuses to publish an event with no ticket type', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerAToken))
      .send(futureEvent())
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/organizer/events/${created.body.id}/publish`)
      .set(auth(organizerAToken))
      .expect(409);
    expect(res.body.code).toBe(ErrorCode.EVENT_NOT_PUBLISHABLE);
  });

  it('publishes an event with a ticket type and lists it publicly', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerAToken))
      .send(futureEvent())
      .expect(201);
    const eventId = created.body.id as string;

    await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/ticket-types`)
      .set(auth(organizerAToken))
      .send({ name: 'GA', priceVnd: 200000, quantityTotal: 100 })
      .expect(201);

    const published = await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/publish`)
      .set(auth(organizerAToken))
      .expect(200);
    expect(published.body.status).toBe('PUBLISHED');

    const publicList = await request(app.getHttpServer())
      .get('/api/events')
      .expect(200);
    expect(publicList.body.some((e: { id: string }) => e.id === eventId)).toBe(
      true,
    );
  });

  it('hides DRAFT events from the public list', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerAToken))
      .send(futureEvent())
      .expect(201);

    const publicList = await request(app.getHttpServer())
      .get('/api/events')
      .expect(200);
    expect(
      publicList.body.some((e: { id: string }) => e.id === created.body.id),
    ).toBe(false);
  });

  it("returns 404 when accessing another organizer's event", async () => {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerAToken))
      .send(futureEvent())
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/organizer/events/${created.body.id}`)
      .set(auth(organizerBToken))
      .expect(404);
    expect(res.body.code).toBe(ErrorCode.NOT_FOUND);
  });

  it('rejects an illegal transition (cancel a DRAFT)', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerAToken))
      .send(futureEvent())
      .expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/organizer/events/${created.body.id}/cancel`)
      .set(auth(organizerAToken))
      .expect(409);
    expect(res.body.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
  });

  it('deletes a DRAFT but refuses to delete a PUBLISHED event', async () => {
    const draft = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerAToken))
      .send(futureEvent())
      .expect(201);
    await request(app.getHttpServer())
      .delete(`/api/organizer/events/${draft.body.id}`)
      .set(auth(organizerAToken))
      .expect(204);

    const published = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerAToken))
      .send(futureEvent())
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/organizer/events/${published.body.id}/ticket-types`)
      .set(auth(organizerAToken))
      .send({ name: 'GA', priceVnd: 0, quantityTotal: 50 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/organizer/events/${published.body.id}/publish`)
      .set(auth(organizerAToken))
      .expect(200);

    const res = await request(app.getHttpServer())
      .delete(`/api/organizer/events/${published.body.id}`)
      .set(auth(organizerAToken))
      .expect(409);
    expect(res.body.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
  });

  it('blocks removing the last ticket type of a PUBLISHED event', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerAToken))
      .send(futureEvent())
      .expect(201);
    const addRes = await request(app.getHttpServer())
      .post(`/api/organizer/events/${created.body.id}/ticket-types`)
      .set(auth(organizerAToken))
      .send({ name: 'GA', priceVnd: 200000, quantityTotal: 10 })
      .expect(201);
    const typeId = addRes.body.ticketTypes[0].id as string;
    await request(app.getHttpServer())
      .post(`/api/organizer/events/${created.body.id}/publish`)
      .set(auth(organizerAToken))
      .expect(200);

    const res = await request(app.getHttpServer())
      .delete(`/api/organizer/events/${created.body.id}/ticket-types/${typeId}`)
      .set(auth(organizerAToken))
      .expect(409);
    expect(res.body.code).toBe(ErrorCode.LAST_TICKET_TYPE);
  });

  it('unpublishes a PUBLISHED event back to DRAFT', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerAToken))
      .send(futureEvent())
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/organizer/events/${created.body.id}/ticket-types`)
      .set(auth(organizerAToken))
      .send({ name: 'GA', priceVnd: 200000, quantityTotal: 10 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/organizer/events/${created.body.id}/publish`)
      .set(auth(organizerAToken))
      .expect(200);

    const res = await request(app.getHttpServer())
      .post(`/api/organizer/events/${created.body.id}/unpublish`)
      .set(auth(organizerAToken))
      .expect(200);
    expect(res.body.status).toBe('DRAFT');
  });
});
