import {
  BadRequestException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

const WEBHOOK_API_KEY = 'e2e-sepay-review-key';
process.env.SEPAY_WEBHOOK_API_KEY = WEBHOOK_API_KEY;

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

const sepayBody = (
  txnId: number,
  amount: number,
  code: string,
): Record<string, unknown> => ({
  id: txnId,
  gateway: 'MBBank',
  transactionDate: '2026-08-08 10:00:00',
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

type ReviewItem = {
  id: string;
  sepayTxnId: string;
  status: string;
  amountVnd: number;
  reviewReason: string | null;
  reviewedAt: string | null;
  reviewedByName: string | null;
  adminNote: string | null;
  order: { id: string; status: string; eventTitle: string } | null;
};

describe('Admin payment review queue (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];
  const txnIds: number[] = [];
  const tag = Date.now();
  let seq = 0;
  const nextTxn = () => tag * 1000 + seq++;

  let adminToken: string;
  let organizerToken: string;
  let buyerToken: string;

  async function register(role: 'ATTENDEE' | 'ORGANIZER', label: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-payrev-${label}-${tag}@example.com`,
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
  const apikey = (key: string) => ({ Authorization: `Apikey ${key}` });

  async function createPaidEvent(): Promise<{
    eventId: string;
    ticketTypeId: string;
  }> {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerToken))
      .send({
        title: `E2E Review Concert ${tag}`,
        description: 'A paid event whose money may go astray.',
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

  /** Drives money into an order that has already expired: the AC-9 gap case. */
  async function seedReviewCase(): Promise<{ txn: number; orderId: string }> {
    const { eventId, ticketTypeId } = await createPaidEvent();
    const order = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({ eventId, items: [{ ticketTypeId, quantity: 1 }] })
      .expect(201);
    const orderId = order.body.id as string;
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'EXPIRED', expiredAt: new Date() },
    });

    const txn = nextTxn();
    txnIds.push(txn);
    await request(app.getHttpServer())
      .post('/api/payments/sepay/webhook')
      .set(apikey(WEBHOOK_API_KEY))
      .send(
        sepayBody(
          txn,
          order.body.payment.amountVnd as number,
          order.body.payment.transferCode as string,
        ),
      )
      .expect(200);

    return { txn, orderId };
  }

  /** Reads the queue and picks out one transaction, ignoring other tests' rows. */
  async function findInQueue(
    txn: number,
    resolved: boolean,
  ): Promise<ReviewItem | undefined> {
    const res = await request(app.getHttpServer())
      .get(`/api/admin/payments/review?resolved=${resolved}&limit=100`)
      .set(auth(adminToken))
      .expect(200);
    return (res.body.items as ReviewItem[]).find(
      (item) => item.sepayTxnId === String(txn),
    );
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
    buyerToken = (await register('ATTENDEE', 'buyer')).token;

    // ADMIN cannot self-sign-up; register then promote directly.
    const admin = await register('ATTENDEE', 'admin');
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: 'ADMIN', fullName: 'E2E Reviewer' },
    });
    adminToken = admin.token;
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
    const res = await request(app.getHttpServer())
      .get('/api/admin/payments/review')
      .set(auth(organizerToken))
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.FORBIDDEN_ROLE);
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer())
      .get('/api/admin/payments/review')
      .expect(401);
  });

  it('surfaces a transfer that arrived after the order expired', async () => {
    const { txn, orderId } = await seedReviewCase();

    const item = await findInQueue(txn, false);
    expect(item).toBeDefined();
    expect(item).toMatchObject({
      status: 'REVIEW_REQUIRED',
      amountVnd: 200000,
      reviewedAt: null,
      adminNote: null,
    });
    expect(item?.reviewReason).toBeTruthy();
    // The order context is what lets an admin find the buyer to refund.
    expect(item?.order).toMatchObject({ id: orderId, status: 'EXPIRED' });
    expect(item?.order?.eventTitle).toContain('E2E Review Concert');
  });

  it('counts open cases so the dashboard can badge the queue', async () => {
    await seedReviewCase();

    const res = await request(app.getHttpServer())
      .get('/api/admin/payments/review')
      .set(auth(adminToken))
      .expect(200);
    expect(res.body.openCount).toBeGreaterThanOrEqual(1);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(20);
  });

  it('closes a case, stamping who reviewed it and what they did', async () => {
    const { txn } = await seedReviewCase();
    const open = await findInQueue(txn, false);

    const resolved = await request(app.getHttpServer())
      .post(`/api/admin/payments/${open!.id}/resolve`)
      .set(auth(adminToken))
      .send({ note: 'Đã hoàn tiền qua ngân hàng, mã REF-99.' })
      .expect(200);
    expect(resolved.body).toMatchObject({
      id: open!.id,
      reviewedByName: 'E2E Reviewer',
      adminNote: 'Đã hoàn tiền qua ngân hàng, mã REF-99.',
    });
    expect(resolved.body.reviewedAt).toBeTruthy();

    // It leaves the open queue and shows up under the closed filter.
    expect(await findInQueue(txn, false)).toBeUndefined();
    expect(await findInQueue(txn, true)).toBeDefined();
  });

  it('refuses to close the same case twice', async () => {
    const { txn } = await seedReviewCase();
    const open = await findInQueue(txn, false);

    await request(app.getHttpServer())
      .post(`/api/admin/payments/${open!.id}/resolve`)
      .set(auth(adminToken))
      .send({ note: 'Đã liên hệ khách.' })
      .expect(200);

    const again = await request(app.getHttpServer())
      .post(`/api/admin/payments/${open!.id}/resolve`)
      .set(auth(adminToken))
      .send({ note: 'Lần hai.' })
      .expect(409);
    expect(again.body.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);
  });

  it('requires a note', async () => {
    const { txn } = await seedReviewCase();
    const open = await findInQueue(txn, false);

    const res = await request(app.getHttpServer())
      .post(`/api/admin/payments/${open!.id}/resolve`)
      .set(auth(adminToken))
      .send({ note: '   ' })
      .expect(400);
    expect(res.body.code).toBe(ErrorCode.VALIDATION_FAILED);
  });

  it('does not let a settled payment be resolved', async () => {
    const { eventId, ticketTypeId } = await createPaidEvent();
    const order = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyerToken))
      .send({ eventId, items: [{ ticketTypeId, quantity: 1 }] })
      .expect(201);
    const txn = nextTxn();
    txnIds.push(txn);
    await request(app.getHttpServer())
      .post('/api/payments/sepay/webhook')
      .set(apikey(WEBHOOK_API_KEY))
      .send(
        sepayBody(
          txn,
          order.body.payment.amountVnd as number,
          order.body.payment.transferCode as string,
        ),
      )
      .expect(200);

    const matched = await prisma.payment.findUniqueOrThrow({
      where: { sepayTxnId: String(txn) },
    });
    expect(matched.status).toBe('MATCHED');

    const res = await request(app.getHttpServer())
      .post(`/api/admin/payments/${matched.id}/resolve`)
      .set(auth(adminToken))
      .send({ note: 'Should not apply.' })
      .expect(404);
    expect(res.body.code).toBe(ErrorCode.NOT_FOUND);
  });
});
