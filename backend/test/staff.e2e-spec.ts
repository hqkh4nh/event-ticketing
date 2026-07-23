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

const futureEvent = () => ({
  title: 'E2E Staff Concert',
  description: 'A staff onboarding test event.',
  venue: 'Test Arena',
  city: 'Ha Noi',
  category: 'MUSIC',
  startAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  endAt: new Date(
    Date.now() + 30 * 24 * 3600 * 1000 + 3 * 3600 * 1000,
  ).toISOString(),
});

describe('Staff device onboarding (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];
  const tag = Date.now();

  let organizerToken: string;
  let otherOrganizerToken: string;
  let buyerToken: string;

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function register(
    role: 'ATTENDEE' | 'ORGANIZER',
    label: string,
  ): Promise<{ token: string; id: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-staff-${label}-${tag}@example.com`,
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
  async function createPublishedEvent(token: string): Promise<{
    eventId: string;
    ticketTypeId: string;
  }> {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(token))
      .send(futureEvent())
      .expect(201);
    const eventId = created.body.id as string;

    const withType = await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/ticket-types`)
      .set(auth(token))
      .send({ name: 'Free GA', priceVnd: 0, quantityTotal: 100 })
      .expect(201);
    const ticketTypeId = withType.body.ticketTypes[0].id as string;

    await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/publish`)
      .set(auth(token))
      .expect(200);

    return { eventId, ticketTypeId };
  }

  /** Creates a device on the event and returns its id and connect code. */
  async function createDevice(
    eventId: string,
    label = 'Gate A',
    token = organizerToken,
  ): Promise<{ staffId: string; connectCode: string }> {
    const res = await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/staff`)
      .set(auth(token))
      .send({ label })
      .expect(201);
    return {
      staffId: res.body.staff.id as string,
      connectCode: res.body.connectCode as string,
    };
  }

  /** Redeems a connect code and returns the scanner session token. */
  async function redeem(code: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/staff-connect')
      .send({ code })
      .expect(200);
    return res.body.accessToken as string;
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
    await app.init();

    const organizer = await register('ORGANIZER', 'org');
    await prisma.user.update({
      where: { id: organizer.id },
      data: { status: 'ACTIVE' },
    });
    organizerToken = organizer.token;

    const otherOrganizer = await register('ORGANIZER', 'other-org');
    await prisma.user.update({
      where: { id: otherOrganizer.id },
      data: { status: 'ACTIVE' },
    });
    otherOrganizerToken = otherOrganizer.token;

    buyerToken = (await register('ATTENDEE', 'buyer')).token;
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
      // Device accounts (and their connect codes, via cascade).
      await prisma.user.deleteMany({
        where: { managedById: { in: userIds } },
      });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
    await app.close();
  });

  describe('creating a device (AC-21)', () => {
    it('creates a SCANNER account with no login identity and a one-time code', async () => {
      const { eventId } = await createPublishedEvent(organizerToken);

      const res = await request(app.getHttpServer())
        .post(`/api/organizer/events/${eventId}/staff`)
        .set(auth(organizerToken))
        .send({ label: 'Gate A' })
        .expect(201);

      expect(res.body.connectCode).toMatch(/^[A-HJ-NP-Z2-9]{8}$/);
      expect(res.body.staff.label).toBe('Gate A');
      expect(res.body.staff.hasActiveCode).toBe(true);

      // Subtype invariant: SCANNER <=> no email <=> owned by an organizer.
      const device = await prisma.user.findUnique({
        where: { id: res.body.staff.id as string },
        select: {
          role: true,
          email: true,
          passwordHash: true,
          managedById: true,
        },
      });
      expect(device?.role).toBe('SCANNER');
      expect(device?.email).toBeNull();
      expect(device?.passwordHash).toBeNull();
      expect(device?.managedById).toBeDefined();

      const assignment = await prisma.eventStaff.findFirst({
        where: { eventId, userId: res.body.staff.id as string },
      });
      expect(assignment).not.toBeNull();

      // Only the hash is stored, never the plaintext.
      const code = await prisma.staffConnectCode.findFirst({
        where: { staffId: res.body.staff.id as string },
        select: { codeHash: true, redeemedAt: true },
      });
      expect(code?.redeemedAt).toBeNull();
      expect(code?.codeHash).not.toBe(res.body.connectCode);
    });

    it('rejects creating a device on another organizer event with 404', async () => {
      const { eventId } = await createPublishedEvent(organizerToken);

      const res = await request(app.getHttpServer())
        .post(`/api/organizer/events/${eventId}/staff`)
        .set(auth(otherOrganizerToken))
        .send({ label: 'Intruder Gate' })
        .expect(404);

      expect(res.body.code).toBe(ErrorCode.NOT_FOUND);
    });

    it('rejects an empty label', async () => {
      const { eventId } = await createPublishedEvent(organizerToken);

      await request(app.getHttpServer())
        .post(`/api/organizer/events/${eventId}/staff`)
        .set(auth(organizerToken))
        .send({ label: '' })
        .expect(400);
    });
  });

  describe('redeeming a connect code (AC-22)', () => {
    it('exchanges the code for a session that can check in the right event', async () => {
      const { eventId, ticketTypeId } =
        await createPublishedEvent(organizerToken);
      const { connectCode } = await createDevice(eventId);

      const scannerToken = await redeem(connectCode);
      const qr = await issueTicket(eventId, ticketTypeId);

      const res = await request(app.getHttpServer())
        .post(`/api/events/${eventId}/checkin`)
        .set(auth(scannerToken))
        .send({ qr })
        .expect(200);
      expect(res.body.result).toBe('VALID');
    });

    it('accepts the code case-insensitively and trimmed', async () => {
      const { eventId } = await createPublishedEvent(organizerToken);
      const { connectCode } = await createDevice(eventId);

      await redeem(`  ${connectCode.toLowerCase()}  `);
    });

    it('rejects a second redemption of the same code', async () => {
      const { eventId } = await createPublishedEvent(organizerToken);
      const { connectCode } = await createDevice(eventId);

      await redeem(connectCode);
      const res = await request(app.getHttpServer())
        .post('/api/auth/staff-connect')
        .send({ code: connectCode })
        .expect(401);
      expect(res.body.code).toBe(ErrorCode.INVALID_CONNECT_CODE);
    });

    it('rejects an expired code', async () => {
      const { eventId } = await createPublishedEvent(organizerToken);
      const { staffId, connectCode } = await createDevice(eventId);
      await prisma.staffConnectCode.updateMany({
        where: { staffId },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      const res = await request(app.getHttpServer())
        .post('/api/auth/staff-connect')
        .send({ code: connectCode })
        .expect(401);
      expect(res.body.code).toBe(ErrorCode.INVALID_CONNECT_CODE);
    });

    it('rejects an unknown code', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/staff-connect')
        .send({ code: 'ZZZZZZZZ' })
        .expect(401);
      expect(res.body.code).toBe(ErrorCode.INVALID_CONNECT_CODE);
    });
  });

  describe('managing devices (AC-23)', () => {
    it('lists devices of my event with code and scan state', async () => {
      const { eventId, ticketTypeId } =
        await createPublishedEvent(organizerToken);
      const gateA = await createDevice(eventId, 'Gate A');
      await createDevice(eventId, 'Gate B');

      // Redeem Gate A's code and scan once so its state diverges from Gate B.
      const scannerToken = await redeem(gateA.connectCode);
      const qr = await issueTicket(eventId, ticketTypeId);
      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/checkin`)
        .set(auth(scannerToken))
        .send({ qr })
        .expect(200);

      const res = await request(app.getHttpServer())
        .get(`/api/organizer/events/${eventId}/staff`)
        .set(auth(organizerToken))
        .expect(200);

      expect(res.body).toHaveLength(2);
      const byLabel = new Map(
        (res.body as Array<Record<string, unknown>>).map((d) => [d.label, d]),
      );
      const a = byLabel.get('Gate A') as Record<string, unknown>;
      const b = byLabel.get('Gate B') as Record<string, unknown>;
      expect(a.hasActiveCode).toBe(false);
      expect(a.lastScanAt).not.toBeNull();
      expect(b.hasActiveCode).toBe(true);
      expect(b.lastScanAt).toBeNull();
    });

    it('blocking a device kills its session and its live code immediately', async () => {
      const { eventId, ticketTypeId } =
        await createPublishedEvent(organizerToken);
      const first = await createDevice(eventId, 'Gate A');
      const scannerToken = await redeem(first.connectCode);
      const qr = await issueTicket(eventId, ticketTypeId);

      // A second, unredeemed code for the same device.
      const reconnect = await request(app.getHttpServer())
        .post(`/api/organizer/staff/${first.staffId}/reconnect`)
        .set(auth(organizerToken))
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/api/organizer/staff/${first.staffId}`)
        .set(auth(organizerToken))
        .send({ status: 'BLOCKED' })
        .expect(200);

      // Existing JWT dies: status is read from the DB per request.
      const blockedScan = await request(app.getHttpServer())
        .post(`/api/events/${eventId}/checkin`)
        .set(auth(scannerToken))
        .send({ qr })
        .expect(401);
      expect(blockedScan.body.code).toBe(ErrorCode.ACCOUNT_BLOCKED);

      // The still-unredeemed code dies too.
      await request(app.getHttpServer())
        .post('/api/auth/staff-connect')
        .send({ code: reconnect.body.connectCode as string })
        .expect(401);

      // Unblock restores the session.
      await request(app.getHttpServer())
        .patch(`/api/organizer/staff/${first.staffId}`)
        .set(auth(organizerToken))
        .send({ status: 'ACTIVE' })
        .expect(200);
      await request(app.getHttpServer())
        .post(`/api/events/${eventId}/checkin`)
        .set(auth(scannerToken))
        .send({ qr })
        .expect(200);
    });

    it('reconnect invalidates the old unredeemed code and issues a working one', async () => {
      const { eventId } = await createPublishedEvent(organizerToken);
      const { staffId, connectCode } = await createDevice(eventId);

      const res = await request(app.getHttpServer())
        .post(`/api/organizer/staff/${staffId}/reconnect`)
        .set(auth(organizerToken))
        .expect(201);
      const newCode = res.body.connectCode as string;

      await request(app.getHttpServer())
        .post('/api/auth/staff-connect')
        .send({ code: connectCode })
        .expect(401);
      await redeem(newCode);
    });

    it('hides another organizer devices behind 404', async () => {
      const { eventId } = await createPublishedEvent(organizerToken);
      const { staffId } = await createDevice(eventId);

      await request(app.getHttpServer())
        .get(`/api/organizer/events/${eventId}/staff`)
        .set(auth(otherOrganizerToken))
        .expect(404);
      await request(app.getHttpServer())
        .patch(`/api/organizer/staff/${staffId}`)
        .set(auth(otherOrganizerToken))
        .send({ status: 'BLOCKED' })
        .expect(404);
      await request(app.getHttpServer())
        .post(`/api/organizer/staff/${staffId}/reconnect`)
        .set(auth(otherOrganizerToken))
        .expect(404);
    });

    it('renames a device via PATCH label', async () => {
      const { eventId } = await createPublishedEvent(organizerToken);
      const { staffId } = await createDevice(eventId, 'Gate A');

      const res = await request(app.getHttpServer())
        .patch(`/api/organizer/staff/${staffId}`)
        .set(auth(organizerToken))
        .send({ label: 'Main Entrance' })
        .expect(200);
      expect(res.body.label).toBe('Main Entrance');
    });
  });
});
