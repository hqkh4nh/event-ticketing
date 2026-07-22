import { createHmac } from 'node:crypto';

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
import { OrdersExpiryService } from '../src/modules/orders/orders-expiry.service';
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
  title: 'E2E Free Concert',
  description: 'A free test event.',
  venue: 'Test Arena',
  city: 'Ha Noi',
  category: 'MUSIC',
  startAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  endAt: new Date(
    Date.now() + 30 * 24 * 3600 * 1000 + 3 * 3600 * 1000,
  ).toISOString(),
});

type TicketTypeInput = {
  name: string;
  priceVnd: number;
  quantityTotal: number;
};

describe('Orders / free ticket booking (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];
  const tag = Date.now();

  let organizerToken: string;
  let buyerAToken: string;
  let buyerBToken: string;

  async function register(role: 'ATTENDEE' | 'ORGANIZER', label: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-order-${label}-${tag}@example.com`,
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

  /** Creates a PUBLISHED event; returns its id and a name -> ticketTypeId map. */
  async function createPublishedEvent(
    ticketTypes: TicketTypeInput[],
  ): Promise<{ eventId: string; idByName: Record<string, string> }> {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerToken))
      .send(futureEvent())
      .expect(201);
    const eventId = created.body.id as string;

    let last = created.body;
    for (const ticketType of ticketTypes) {
      const res = await request(app.getHttpServer())
        .post(`/api/organizer/events/${eventId}/ticket-types`)
        .set(auth(organizerToken))
        .send(ticketType)
        .expect(201);
      last = res.body;
    }
    await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/publish`)
      .set(auth(organizerToken))
      .expect(200);

    const idByName: Record<string, string> = {};
    for (const type of last.ticketTypes as { id: string; name: string }[]) {
      idByName[type.name] = type.id;
    }
    return { eventId, idByName };
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

    buyerAToken = (await register('ATTENDEE', 'buyera')).token;
    buyerBToken = (await register('ATTENDEE', 'buyerb')).token;
  });

  afterAll(async () => {
    if (userIds.length) {
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

  it('issues signed tickets for a free order', async () => {
    const { eventId, idByName } = await createPublishedEvent([
      { name: 'Free GA', priceVnd: 0, quantityTotal: 100 },
    ]);

    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerAToken))
      .send({
        eventId,
        items: [{ ticketTypeId: idByName['Free GA'], quantity: 2 }],
      })
      .expect(201);

    expect(res.body.status).toBe('PAID');
    expect(res.body.totalVnd).toBe(0);
    expect(res.body.tickets).toHaveLength(2);

    const secret = process.env.TICKET_HMAC_SECRET as string;
    for (const ticket of res.body.tickets as {
      code: string;
      signature: string;
      qrPayload: string;
      status: string;
    }[]) {
      expect(ticket.status).toBe('ISSUED');
      expect(ticket.qrPayload).toBe(`${ticket.code}.${ticket.signature}`);
      const expected = createHmac('sha256', secret)
        .update(ticket.code)
        .digest('base64url');
      expect(ticket.signature).toBe(expected);
    }
  });

  it('never oversells when two buyers race for the last ticket', async () => {
    const { eventId, idByName } = await createPublishedEvent([
      { name: 'Solo', priceVnd: 0, quantityTotal: 1 },
    ]);
    const body = {
      eventId,
      items: [{ ticketTypeId: idByName['Solo'], quantity: 1 }],
    };

    const [resA, resB] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(buyerAToken))
        .send(body),
      request(app.getHttpServer())
        .post('/api/orders')
        .set(auth(buyerBToken))
        .send(body),
    ]);

    const statuses = [resA.status, resB.status].sort();
    expect(statuses).toEqual([201, 409]);
    const loser = resA.status === 409 ? resA : resB;
    expect(loser.body.code).toBe(ErrorCode.SOLD_OUT);

    const issued = await prisma.ticket.count({
      where: { orderItem: { ticketTypeId: idByName['Solo'] } },
    });
    expect(issued).toBe(1);
  });

  it('creates a PENDING order with VietQR for a paid ticket type', async () => {
    const { eventId, idByName } = await createPublishedEvent([
      { name: 'Paid', priceVnd: 200000, quantityTotal: 50 },
    ]);

    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerAToken))
      .send({
        eventId,
        items: [{ ticketTypeId: idByName['Paid'], quantity: 2 }],
      })
      .expect(201);

    expect(res.body.status).toBe('PENDING');
    expect(res.body.totalVnd).toBe(400000);
    expect(res.body.tickets).toHaveLength(0);
    expect(res.body.payment).toBeDefined();
    expect(res.body.payment.amountVnd).toBe(400000);
    expect(typeof res.body.payment.transferCode).toBe('string');
    expect(res.body.payment.transferCode.length).toBeGreaterThan(0);
    expect(new Date(res.body.payment.expiresAt).getTime()).toBeGreaterThan(
      Date.now(),
    );
    expect(res.body.payment.qrImageUrl).toContain(
      res.body.payment.transferCode,
    );
    expect(res.body.payment.qrImageUrl).toContain('400000');

    const issued = await prisma.ticket.count({
      where: { orderItem: { ticketTypeId: idByName['Paid'] } },
    });
    expect(issued).toBe(0);
  });

  it('expires a stale PENDING order and releases its held seats', async () => {
    const { eventId, idByName } = await createPublishedEvent([
      { name: 'Last Paid', priceVnd: 150000, quantityTotal: 1 },
    ]);
    const body = {
      eventId,
      items: [{ ticketTypeId: idByName['Last Paid'], quantity: 1 }],
    };

    const held = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerAToken))
      .send(body)
      .expect(201);
    expect(held.body.status).toBe('PENDING');

    // A second buyer cannot take the seat while the hold is live.
    await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerBToken))
      .send(body)
      .expect(409);

    // Force the hold past its window, then run the sweep.
    await prisma.order.update({
      where: { id: held.body.id as string },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    await app.get(OrdersExpiryService).sweepExpired();

    const expired = await prisma.order.findUnique({
      where: { id: held.body.id as string },
      select: { status: true, expiredAt: true },
    });
    expect(expired?.status).toBe('EXPIRED');
    expect(expired?.expiredAt).not.toBeNull();

    // The released seat is now bookable again.
    await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerBToken))
      .send(body)
      .expect(201);
  });

  it('rejects ordering from an unpublished event', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerToken))
      .send(futureEvent())
      .expect(201);
    const addRes = await request(app.getHttpServer())
      .post(`/api/organizer/events/${created.body.id}/ticket-types`)
      .set(auth(organizerToken))
      .send({ name: 'Draft GA', priceVnd: 0, quantityTotal: 10 })
      .expect(201);
    const ticketTypeId = addRes.body.ticketTypes[0].id as string;

    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerAToken))
      .send({
        eventId: created.body.id,
        items: [{ ticketTypeId, quantity: 1 }],
      })
      .expect(409);
    expect(res.body.code).toBe(ErrorCode.EVENT_NOT_PURCHASABLE);
  });

  it('is idempotent for a repeated clientRequestId', async () => {
    const { eventId, idByName } = await createPublishedEvent([
      { name: 'Idem GA', priceVnd: 0, quantityTotal: 100 },
    ]);
    const payload = {
      eventId,
      items: [{ ticketTypeId: idByName['Idem GA'], quantity: 1 }],
      clientRequestId: `idem-${tag}`,
    };

    const first = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerBToken))
      .send(payload)
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerBToken))
      .send(payload)
      .expect(201);

    expect(second.body.id).toBe(first.body.id);
    expect(second.body.tickets).toHaveLength(1);

    const issued = await prisma.ticket.count({
      where: { orderItem: { ticketTypeId: idByName['Idem GA'] } },
    });
    expect(issued).toBe(1);
  });

  it("lists the buyer's issued tickets", async () => {
    const { eventId, idByName } = await createPublishedEvent([
      { name: 'Mine GA', priceVnd: 0, quantityTotal: 100 },
    ]);
    await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerAToken))
      .send({
        eventId,
        items: [{ ticketTypeId: idByName['Mine GA'], quantity: 1 }],
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get('/api/me/tickets')
      .set(auth(buyerAToken))
      .expect(200);

    const mine = (res.body as { ticketTypeName: string }[]).filter(
      (t) => t.ticketTypeName === 'Mine GA',
    );
    expect(mine).toHaveLength(1);
  });

  it("returns 404 for another user's order", async () => {
    const { eventId, idByName } = await createPublishedEvent([
      { name: 'Private GA', priceVnd: 0, quantityTotal: 100 },
    ]);
    const order = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerAToken))
      .send({
        eventId,
        items: [{ ticketTypeId: idByName['Private GA'], quantity: 1 }],
      })
      .expect(201);

    const res = await request(app.getHttpServer())
      .get(`/api/orders/${order.body.id}`)
      .set(auth(buyerBToken))
      .expect(404);
    expect(res.body.code).toBe(ErrorCode.NOT_FOUND);
  });
});
