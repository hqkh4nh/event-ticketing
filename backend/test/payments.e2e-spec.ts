import { createHmac } from 'node:crypto';

import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

const WEBHOOK_API_KEY = 'e2e-sepay-key';
process.env.SEPAY_WEBHOOK_API_KEY = WEBHOOK_API_KEY;

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
  title: 'E2E Paid Concert',
  description: 'A paid test event.',
  venue: 'Test Arena',
  city: 'Ha Noi',
  category: 'MUSIC',
  startAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  endAt: new Date(
    Date.now() + 30 * 24 * 3600 * 1000 + 3 * 3600 * 1000,
  ).toISOString(),
});

/** Builds a SePay webhook body; `code` carries the order's transferCode. */
const sepayBody = (
  txnId: number,
  amount: number,
  code: string,
): Record<string, unknown> => ({
  id: txnId,
  gateway: 'MBBank',
  transactionDate: '2026-07-20 10:00:00',
  accountNumber: '0123456789',
  code,
  content: `${code} thanh toan ve`,
  transferType: 'in',
  transferAmount: amount,
  accumulated: 0,
  subAccount: null,
  referenceCode: `REF${txnId}`,
  description: '',
});

const apikey = (key: string) => ({ Authorization: `Apikey ${key}` });

describe('Payments / SePay webhook (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];
  const txnIds: number[] = [];
  const tag = Date.now();
  let seq = 0;
  const nextTxn = () => tag * 1000 + seq++;

  let organizerToken: string;
  let buyerToken: string;
  let adminId: string;

  async function register(role: 'ATTENDEE' | 'ORGANIZER', label: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-pay-${label}-${tag}@example.com`,
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

  /** Creates a PUBLISHED event with one paid ticket type. */
  async function createPaidEvent(
    priceVnd: number,
    quantityTotal: number,
  ): Promise<{ eventId: string; ticketTypeId: string }> {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerToken))
      .send(futureEvent())
      .expect(201);
    const eventId = created.body.id as string;
    const tt = await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/ticket-types`)
      .set(auth(organizerToken))
      .send({ name: 'Paid GA', priceVnd, quantityTotal })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/publish`)
      .set(auth(organizerToken))
      .expect(200);
    const ticketTypeId = (
      tt.body.ticketTypes as { id: string; name: string }[]
    ).find((t) => t.name === 'Paid GA')!.id;
    return { eventId, ticketTypeId };
  }

  /** Creates a PENDING paid order and returns its payment details. */
  async function createPendingOrder(
    eventId: string,
    ticketTypeId: string,
    quantity: number,
  ): Promise<{ orderId: string; amountVnd: number; transferCode: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({ eventId, items: [{ ticketTypeId, quantity }] })
      .expect(201);
    expect(res.body.status).toBe('PENDING');
    return {
      orderId: res.body.id as string,
      amountVnd: res.body.payment.amountVnd as number,
      transferCode: res.body.payment.transferCode as string,
    };
  }

  const ticketCount = (orderId: string) =>
    prisma.ticket.count({ where: { orderItem: { orderId } } });

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
    buyerToken = (await register('ATTENDEE', 'buyer')).token;
    // ADMIN cannot self-sign-up; register then promote directly.
    const admin = await register('ATTENDEE', 'admin');
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: 'ADMIN' },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await prisma.payment.deleteMany({
      where: { sepayTxnId: { in: txnIds.map(String) } },
    });
    if (userIds.length) {
      await prisma.notification.deleteMany({
        where: { userId: { in: userIds } },
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

  it('issues tickets when a transfer matches a PENDING order', async () => {
    const { eventId, ticketTypeId } = await createPaidEvent(200000, 50);
    const { orderId, amountVnd, transferCode } = await createPendingOrder(
      eventId,
      ticketTypeId,
      2,
    );
    const txn = nextTxn();
    txnIds.push(txn);

    await request(app.getHttpServer())
      .post('/api/payments/sepay/webhook')
      .set(apikey(WEBHOOK_API_KEY))
      .send(sepayBody(txn, amountVnd, transferCode))
      .expect(200);

    const order = await request(app.getHttpServer())
      .get(`/api/orders/${orderId}`)
      .set(auth(buyerToken))
      .expect(200);
    expect(order.body.status).toBe('PAID');
    expect(order.body.tickets).toHaveLength(2);
    expect(order.body.payment).toBeUndefined();

    const secret = process.env.TICKET_HMAC_SECRET as string;
    for (const ticket of order.body.tickets as {
      code: string;
      signature: string;
      status: string;
    }[]) {
      expect(ticket.status).toBe('ISSUED');
      expect(ticket.signature).toBe(
        createHmac('sha256', secret).update(ticket.code).digest('base64url'),
      );
    }

    const payment = await prisma.payment.findUnique({
      where: { sepayTxnId: String(txn) },
    });
    expect(payment?.status).toBe('MATCHED');
    expect(payment?.orderId).toBe(orderId);
  });

  it('does not issue twice when the same txn id is replayed', async () => {
    const { eventId, ticketTypeId } = await createPaidEvent(200000, 50);
    const { orderId, amountVnd, transferCode } = await createPendingOrder(
      eventId,
      ticketTypeId,
      1,
    );
    const txn = nextTxn();
    txnIds.push(txn);
    const body = sepayBody(txn, amountVnd, transferCode);

    await request(app.getHttpServer())
      .post('/api/payments/sepay/webhook')
      .set(apikey(WEBHOOK_API_KEY))
      .send(body)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/payments/sepay/webhook')
      .set(apikey(WEBHOOK_API_KEY))
      .send(body)
      .expect(200);

    expect(await ticketCount(orderId)).toBe(1);
    expect(
      await prisma.payment.count({ where: { sepayTxnId: String(txn) } }),
    ).toBe(1);
  });

  it('records UNMATCHED and issues nothing when the amount is wrong', async () => {
    const { eventId, ticketTypeId } = await createPaidEvent(200000, 50);
    const { orderId, amountVnd, transferCode } = await createPendingOrder(
      eventId,
      ticketTypeId,
      1,
    );
    const txn = nextTxn();
    txnIds.push(txn);

    await request(app.getHttpServer())
      .post('/api/payments/sepay/webhook')
      .set(apikey(WEBHOOK_API_KEY))
      .send(sepayBody(txn, amountVnd - 1000, transferCode))
      .expect(200);

    expect(await ticketCount(orderId)).toBe(0);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('PENDING');
    const payment = await prisma.payment.findUnique({
      where: { sepayTxnId: String(txn) },
    });
    expect(payment?.status).toBe('UNMATCHED');
  });

  it('rejects a webhook with a missing or wrong API key', async () => {
    const { eventId, ticketTypeId } = await createPaidEvent(200000, 50);
    const { amountVnd, transferCode } = await createPendingOrder(
      eventId,
      ticketTypeId,
      1,
    );
    const txn = nextTxn();

    await request(app.getHttpServer())
      .post('/api/payments/sepay/webhook')
      .send(sepayBody(txn, amountVnd, transferCode))
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/payments/sepay/webhook')
      .set(apikey('wrong-key'))
      .send(sepayBody(txn, amountVnd, transferCode))
      .expect(401);

    expect(
      await prisma.payment.count({ where: { sepayTxnId: String(txn) } }),
    ).toBe(0);
  });

  it('flags REVIEW_REQUIRED when money lands after the order expired', async () => {
    const { eventId, ticketTypeId } = await createPaidEvent(200000, 50);
    const { orderId, amountVnd, transferCode } = await createPendingOrder(
      eventId,
      ticketTypeId,
      1,
    );
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'EXPIRED', expiredAt: new Date() },
    });
    const txn = nextTxn();
    txnIds.push(txn);

    await request(app.getHttpServer())
      .post('/api/payments/sepay/webhook')
      .set(apikey(WEBHOOK_API_KEY))
      .send(sepayBody(txn, amountVnd, transferCode))
      .expect(200);

    expect(await ticketCount(orderId)).toBe(0);
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    expect(order?.status).toBe('EXPIRED');
    const payment = await prisma.payment.findUnique({
      where: { sepayTxnId: String(txn) },
    });
    expect(payment?.status).toBe('REVIEW_REQUIRED');
    expect(payment?.reviewReason).toBeTruthy();

    const adminNote = await prisma.notification.count({
      where: { userId: adminId, type: 'PAYMENT_REVIEW_REQUIRED' },
    });
    expect(adminNote).toBeGreaterThan(0);
  });
});
