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

const bankDetails = {
  bankName: 'Vietcombank',
  bankAccountNumber: '0071000123456',
  bankAccountHolder: 'HUYNH QUOC KHANH',
};

describe('Withdrawals (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];

  let organizerToken: string;
  let organizerId: string;
  let attendeeToken: string;
  let adminToken: string;

  const tag = Date.now();
  let transferCodeSeq = 0;

  async function register(role: 'ATTENDEE' | 'ORGANIZER', label: string) {
    const email = `e2e-wd-${label}-${tag}@example.com`;
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

  /**
   * Seeds settled revenue: a PAID order on an event that has already ended.
   * The organizer API cannot create a past event, so this writes it directly.
   */
  async function seedSettledRevenue(amountVnd: number, endedDaysAgo = 1) {
    const endAt = new Date(Date.now() - endedDaysAgo * 24 * 3600 * 1000);
    const event = await prisma.event.create({
      data: {
        organizerId,
        title: 'E2E Past Concert',
        description: 'Already finished.',
        venue: 'Test Arena',
        city: 'Ha Noi',
        category: 'MUSIC',
        status: 'PUBLISHED',
        startAt: new Date(endAt.getTime() - 3 * 3600 * 1000),
        endAt,
      },
    });
    await prisma.order.create({
      data: {
        buyerId: userIds[0],
        eventId: event.id,
        status: 'PAID',
        totalVnd: BigInt(amountVnd),
        transferCode: `E2EWD${tag}${transferCodeSeq++}`,
        expiresAt: endAt,
        paidAt: endAt,
      },
    });
    return event.id;
  }

  const balance = () =>
    request(app.getHttpServer())
      .get('/api/organizer/withdrawals/balance')
      .set(auth(organizerToken))
      .expect(200);

  const createRequest = (amountVnd: number) =>
    request(app.getHttpServer())
      .post('/api/organizer/withdrawals')
      .set(auth(organizerToken))
      .send({ amountVnd, ...bankDetails });

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
      await prisma.withdrawalRequest.deleteMany({
        where: { organizerId: { in: userIds } },
      });
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

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('rejects a non-organizer role with FORBIDDEN_ROLE', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/organizer/withdrawals')
      .set(auth(attendeeToken))
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.FORBIDDEN_ROLE);
  });

  it('rejects a non-admin role on the admin queue with FORBIDDEN_ROLE', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/admin/withdrawals')
      .set(auth(organizerToken))
      .expect(403);
    expect(res.body.code).toBe(ErrorCode.FORBIDDEN_ROLE);
  });

  it('starts with an empty balance and refuses a request', async () => {
    const res = await balance();
    expect(res.body).toMatchObject({
      settledRevenueVnd: 0,
      pendingVnd: 0,
      withdrawnVnd: 0,
      availableVnd: 0,
      minAmountVnd: 100000,
    });

    const denied = await createRequest(100000).expect(409);
    expect(denied.body.code).toBe(ErrorCode.WITHDRAWAL_AMOUNT_EXCEEDS_BALANCE);
  });

  it('excludes revenue from events that have not ended yet', async () => {
    const upcoming = await prisma.event.create({
      data: {
        organizerId,
        title: 'E2E Upcoming Concert',
        description: 'Still to come.',
        venue: 'Test Arena',
        city: 'Ha Noi',
        category: 'MUSIC',
        status: 'PUBLISHED',
        startAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        endAt: new Date(Date.now() + 31 * 24 * 3600 * 1000),
      },
    });
    await prisma.order.create({
      data: {
        buyerId: userIds[0],
        eventId: upcoming.id,
        status: 'PAID',
        totalVnd: 900000n,
        transferCode: `E2EWD${tag}UP`,
        expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        paidAt: new Date(),
      },
    });

    const res = await balance();
    expect(res.body.settledRevenueVnd).toBe(0);
    expect(res.body.availableVnd).toBe(0);
  });

  it('runs the full submit, approve, and pay cycle', async () => {
    await seedSettledRevenue(1000000);

    const funded = await balance();
    expect(funded.body.settledRevenueVnd).toBe(1000000);
    expect(funded.body.availableVnd).toBe(1000000);

    const tooSmall = await createRequest(50000).expect(400);
    expect(tooSmall.body.code).toBe(ErrorCode.WITHDRAWAL_AMOUNT_TOO_SMALL);

    const tooLarge = await createRequest(2000000).expect(409);
    expect(tooLarge.body.code).toBe(
      ErrorCode.WITHDRAWAL_AMOUNT_EXCEEDS_BALANCE,
    );

    const created = await createRequest(400000).expect(201);
    expect(created.body).toMatchObject({
      amountVnd: 400000,
      status: 'PENDING',
      bankAccountHolder: bankDetails.bankAccountHolder,
    });
    const withdrawalId = created.body.id as string;

    const secondAttempt = await createRequest(100000).expect(409);
    expect(secondAttempt.body.code).toBe(
      ErrorCode.WITHDRAWAL_REQUEST_ALREADY_OPEN,
    );

    const held = await balance();
    expect(held.body.pendingVnd).toBe(400000);
    expect(held.body.availableVnd).toBe(600000);

    const queue = await request(app.getHttpServer())
      .get('/api/admin/withdrawals?status=PENDING')
      .set(auth(adminToken))
      .expect(200);
    expect(
      (queue.body.items as { id: string }[]).some(
        (item) => item.id === withdrawalId,
      ),
    ).toBe(true);

    const paidTooEarly = await request(app.getHttpServer())
      .post(`/api/admin/withdrawals/${withdrawalId}/mark-paid`)
      .set(auth(adminToken))
      .send({})
      .expect(409);
    expect(paidTooEarly.body.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);

    const approved = await request(app.getHttpServer())
      .post(`/api/admin/withdrawals/${withdrawalId}/approve`)
      .set(auth(adminToken))
      .expect(200);
    expect(approved.body.status).toBe('APPROVED');
    expect(approved.body.reviewedAt).not.toBeNull();

    const paid = await request(app.getHttpServer())
      .post(`/api/admin/withdrawals/${withdrawalId}/mark-paid`)
      .set(auth(adminToken))
      .send({ transferReference: 'FT26080812345' })
      .expect(200);
    expect(paid.body).toMatchObject({
      status: 'PAID',
      transferReference: 'FT26080812345',
    });

    const settled = await balance();
    expect(settled.body).toMatchObject({
      pendingVnd: 0,
      withdrawnVnd: 400000,
      availableVnd: 600000,
    });

    const notified = await prisma.notification.count({
      where: { userId: organizerId, type: 'WITHDRAWAL_PAID' },
    });
    expect(notified).toBe(1);
  });

  it('requires a reason to reject and frees the held amount', async () => {
    const created = await createRequest(200000).expect(201);
    const withdrawalId = created.body.id as string;

    const missingReason = await request(app.getHttpServer())
      .post(`/api/admin/withdrawals/${withdrawalId}/reject`)
      .set(auth(adminToken))
      .send({})
      .expect(400);
    expect(missingReason.body.code).toBe(ErrorCode.VALIDATION_FAILED);

    const rejected = await request(app.getHttpServer())
      .post(`/api/admin/withdrawals/${withdrawalId}/reject`)
      .set(auth(adminToken))
      .send({ reason: 'Bank account holder does not match the organizer.' })
      .expect(200);
    expect(rejected.body).toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Bank account holder does not match the organizer.',
    });

    const after = await balance();
    expect(after.body).toMatchObject({ pendingVnd: 0, availableVnd: 600000 });
  });

  it('lets the organizer cancel a request that is still pending', async () => {
    const created = await createRequest(150000).expect(201);
    const withdrawalId = created.body.id as string;

    const cancelled = await request(app.getHttpServer())
      .post(`/api/organizer/withdrawals/${withdrawalId}/cancel`)
      .set(auth(organizerToken))
      .expect(200);
    expect(cancelled.body.status).toBe('CANCELLED');

    const again = await request(app.getHttpServer())
      .post(`/api/organizer/withdrawals/${withdrawalId}/cancel`)
      .set(auth(organizerToken))
      .expect(409);
    expect(again.body.code).toBe(ErrorCode.INVALID_STATE_TRANSITION);

    const after = await balance();
    expect(after.body).toMatchObject({ pendingVnd: 0, availableVnd: 600000 });
  });

  it('hides another organizer request behind NOT_FOUND on cancel', async () => {
    const other = await register('ORGANIZER', 'other');
    await prisma.user.update({
      where: { id: other.id },
      data: { status: 'ACTIVE' },
    });
    const created = await createRequest(100000).expect(201);

    const res = await request(app.getHttpServer())
      .post(`/api/organizer/withdrawals/${created.body.id}/cancel`)
      .set(auth(other.token))
      .expect(404);
    expect(res.body.code).toBe(ErrorCode.NOT_FOUND);
  });
});
