import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import type { AddressInfo } from 'node:net';

import { Test, TestingModule } from '@nestjs/testing';
import { io as ioClient } from 'socket.io-client';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { ErrorCode } from '../src/common/errors/error-code';
import type { CheckinBroadcast } from '../src/modules/realtime/checkin.gateway';
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

const futureEvent = () => ({
  title: 'E2E Checkin Concert',
  description: 'A checkin test event.',
  venue: 'Test Arena',
  city: 'Ha Noi',
  category: 'MUSIC',
  startAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  endAt: new Date(
    Date.now() + 30 * 24 * 3600 * 1000 + 3 * 3600 * 1000,
  ).toISOString(),
});

describe('Checkin / QR scan (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];
  const tag = Date.now();

  let organizerToken: string;
  let buyerToken: string;
  let scannerToken: string;
  let scannerId: string;
  let baseUrl: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function register(
    role: 'ATTENDEE' | 'ORGANIZER',
    label: string,
  ): Promise<{ token: string; id: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-checkin-${label}-${tag}@example.com`,
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

  /** Publishes an event with a single free ticket type. */
  async function createPublishedEvent(): Promise<{
    eventId: string;
    ticketTypeId: string;
  }> {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerToken))
      .send(futureEvent())
      .expect(201);
    const eventId = created.body.id as string;

    const withType = await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/ticket-types`)
      .set(auth(organizerToken))
      .send({ name: 'Free GA', priceVnd: 0, quantityTotal: 100 })
      .expect(201);
    const ticketTypeId = withType.body.ticketTypes[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/publish`)
      .set(auth(organizerToken))
      .expect(200);

    return { eventId, ticketTypeId };
  }

  /** Assigns the scanner as staff of the given event. */
  async function assignScanner(eventId: string): Promise<void> {
    await prisma.eventStaff.create({ data: { eventId, userId: scannerId } });
  }

  /** Books one free ticket and returns its `code.signature` QR payload. */
  async function issueTicket(
    eventId: string,
    ticketTypeId: string,
  ): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({ eventId, items: [{ ticketTypeId, quantity: 1 }] })
      .expect(201);
    return res.body.tickets[0].qrPayload as string;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);
    configureApp(app);
    // Listen on a real port so the Socket.IO gateway is reachable by a client.
    await app.listen(0);
    const server = app.getHttpServer() as { address(): AddressInfo };
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const organizer = await register('ORGANIZER', 'org');
    await prisma.user.update({
      where: { id: organizer.id },
      data: { status: 'ACTIVE' },
    });
    organizerToken = organizer.token;

    buyerToken = (await register('ATTENDEE', 'buyer')).token;

    const scanner = await register('ATTENDEE', 'scanner');
    scannerId = scanner.id;
    scannerToken = scanner.token;
    // Role is loaded live from the DB per request (not carried in the JWT), so
    // promoting the user to SCANNER takes effect on the existing token.
    await prisma.user.update({
      where: { id: scannerId },
      data: { role: 'SCANNER', status: 'ACTIVE' },
    });
  });

  afterAll(async () => {
    if (userIds.length) {
      await prisma.checkinLog.deleteMany({
        where: { event: { organizerId: { in: userIds } } },
      });
      await prisma.eventStaff.deleteMany({
        where: { event: { organizerId: { in: userIds } } },
      });
      await prisma.ticket.deleteMany({
        where: { orderItem: { order: { buyerId: { in: userIds } } } },
      });
      await prisma.order.deleteMany({ where: { buyerId: { in: userIds } } });
      await prisma.event.deleteMany({
        where: { organizerId: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  it('marks a valid ticket VALID and returns the checked-in count', async () => {
    const { eventId, ticketTypeId } = await createPublishedEvent();
    await assignScanner(eventId);
    const qr = await issueTicket(eventId, ticketTypeId);

    const res = await request(app.getHttpServer())
      .post(`/api/events/${eventId}/checkin`)
      .set(auth(scannerToken))
      .send({ qr })
      .expect(200);

    expect(res.body.result).toBe('VALID');
    expect(res.body.checkedInCount).toBe(1);
  });

  it('rejects a second scan of the same ticket as ALREADY_USED', async () => {
    const { eventId, ticketTypeId } = await createPublishedEvent();
    await assignScanner(eventId);
    const qr = await issueTicket(eventId, ticketTypeId);
    const url = `/api/events/${eventId}/checkin`;

    await request(app.getHttpServer())
      .post(url)
      .set(auth(scannerToken))
      .send({ qr })
      .expect(200);
    const second = await request(app.getHttpServer())
      .post(url)
      .set(auth(scannerToken))
      .send({ qr })
      .expect(200);

    expect(second.body.result).toBe('ALREADY_USED');
  });

  it('rejects a forged signature as INVALID', async () => {
    const { eventId, ticketTypeId } = await createPublishedEvent();
    await assignScanner(eventId);
    const qr = await issueTicket(eventId, ticketTypeId);
    const [code] = qr.split('.');

    const res = await request(app.getHttpServer())
      .post(`/api/events/${eventId}/checkin`)
      .set(auth(scannerToken))
      .send({ qr: `${code}.forged-signature` })
      .expect(200);

    expect(res.body.result).toBe('INVALID');
  });

  it('rejects a malformed payload as INVALID', async () => {
    const { eventId } = await createPublishedEvent();
    await assignScanner(eventId);

    const res = await request(app.getHttpServer())
      .post(`/api/events/${eventId}/checkin`)
      .set(auth(scannerToken))
      .send({ qr: 'not-a-valid-payload' })
      .expect(200);

    expect(res.body.result).toBe('INVALID');
  });

  it('rejects a ticket from another event as WRONG_EVENT', async () => {
    const home = await createPublishedEvent();
    await assignScanner(home.eventId);
    const other = await createPublishedEvent();
    const foreignQr = await issueTicket(other.eventId, other.ticketTypeId);

    const res = await request(app.getHttpServer())
      .post(`/api/events/${home.eventId}/checkin`)
      .set(auth(scannerToken))
      .send({ qr: foreignQr })
      .expect(200);

    expect(res.body.result).toBe('WRONG_EVENT');
  });

  it('forbids a scanner not assigned to the event', async () => {
    const { eventId, ticketTypeId } = await createPublishedEvent();
    // No assignScanner here.
    const qr = await issueTicket(eventId, ticketTypeId);

    const res = await request(app.getHttpServer())
      .post(`/api/events/${eventId}/checkin`)
      .set(auth(scannerToken))
      .send({ qr })
      .expect(403);

    expect(res.body.code).toBe(ErrorCode.NOT_EVENT_STAFF);
  });

  it('admits exactly one VALID when two scans race for the same ticket', async () => {
    const { eventId, ticketTypeId } = await createPublishedEvent();
    await assignScanner(eventId);
    const qr = await issueTicket(eventId, ticketTypeId);
    const url = `/api/events/${eventId}/checkin`;

    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .post(url)
        .set(auth(scannerToken))
        .send({ qr }),
      request(app.getHttpServer())
        .post(url)
        .set(auth(scannerToken))
        .send({ qr }),
    ]);

    const results = [a.body.result, b.body.result].sort();
    expect(results).toEqual(['ALREADY_USED', 'VALID']);

    const [code] = qr.split('.');
    const ticket = await prisma.ticket.findUnique({
      where: { code },
      select: { status: true, usedByStaffId: true },
    });
    expect(ticket?.status).toBe('USED');
    expect(ticket?.usedByStaffId).toBe(scannerId);
  });

  it('writes a CheckinLog for every scan outcome', async () => {
    const { eventId, ticketTypeId } = await createPublishedEvent();
    await assignScanner(eventId);
    const qr = await issueTicket(eventId, ticketTypeId);
    const url = `/api/events/${eventId}/checkin`;

    await request(app.getHttpServer())
      .post(url)
      .set(auth(scannerToken))
      .send({ qr })
      .expect(200); // VALID
    await request(app.getHttpServer())
      .post(url)
      .set(auth(scannerToken))
      .send({ qr })
      .expect(200); // ALREADY_USED

    const logs = await prisma.checkinLog.findMany({
      where: { eventId },
      select: { result: true },
    });
    const results = logs.map((l) => l.result).sort();
    expect(results).toEqual(['ALREADY_USED', 'VALID']);
  });

  it('broadcasts a VALID check-in to the event owner over Socket.IO', async () => {
    const { eventId, ticketTypeId } = await createPublishedEvent();
    await assignScanner(eventId);
    const qr = await issueTicket(eventId, ticketTypeId);

    const client = ioClient(`${baseUrl}/realtime`, {
      auth: { token: organizerToken },
      transports: ['websocket'],
      forceNew: true,
    });

    try {
      const subscribed = await new Promise<{ ok: boolean }>(
        (resolve, reject) => {
          client.on('connect_error', reject);
          client.on('connect', () => {
            client.emit('subscribe', { eventId }, resolve);
          });
        },
      );
      expect(subscribed.ok).toBe(true);

      const broadcast = new Promise<CheckinBroadcast>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error('no checkin broadcast')),
          5000,
        );
        client.once('checkin', (payload: CheckinBroadcast) => {
          clearTimeout(timer);
          resolve(payload);
        });
      });

      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/checkin`)
        .set(auth(scannerToken))
        .send({ qr })
        .expect(200);

      const payload = await broadcast;
      expect(payload.checkedInCount).toBe(1);
      expect(typeof payload.ticketId).toBe('string');
    } finally {
      client.close();
    }
  });

  it('rejects a Socket.IO connection with an invalid token', async () => {
    const client = ioClient(`${baseUrl}/realtime`, {
      auth: { token: 'not-a-jwt' },
      transports: ['websocket'],
      forceNew: true,
    });

    const stayedConnected = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(client.connected), 1000);
      const settle = (value: boolean) => {
        clearTimeout(timer);
        resolve(value);
      };
      client.on('connect_error', () => settle(false));
      client.on('disconnect', () => settle(false));
    });

    client.close();
    expect(stayedConnected).toBe(false);
  });
});
