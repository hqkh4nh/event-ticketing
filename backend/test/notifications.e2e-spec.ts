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

const futureEvent = (title: string) => ({
  title,
  description: 'A test event.',
  venue: 'Test Arena',
  city: 'Ha Noi',
  category: 'MUSIC',
  startAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
  endAt: new Date(
    Date.now() + 30 * 24 * 3600 * 1000 + 3 * 3600 * 1000,
  ).toISOString(),
});

type NotificationItem = {
  id: string;
  type: string;
  data: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
};

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const userIds: string[] = [];
  const tag = Date.now();
  let seq = 0;

  let organizerToken: string;

  async function register(role: 'ATTENDEE' | 'ORGANIZER', label: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        email: `e2e-notif-${label}-${tag}@example.com`,
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

  /** Creates a PUBLISHED event with one ticket type; free unless priced. */
  async function createPublishedEvent(
    title: string,
    priceVnd = 0,
  ): Promise<{ eventId: string; ticketTypeId: string }> {
    const created = await request(app.getHttpServer())
      .post('/api/organizer/events')
      .set(auth(organizerToken))
      .send(futureEvent(title))
      .expect(201);
    const eventId = created.body.id as string;
    const added = await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/ticket-types`)
      .set(auth(organizerToken))
      .send({ name: 'GA', priceVnd, quantityTotal: 100 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/organizer/events/${eventId}/publish`)
      .set(auth(organizerToken))
      .expect(200);
    // Publishing only asks for review; admin approval is out of this slice.
    await prisma.event.update({
      where: { id: eventId },
      data: { status: 'PUBLISHED' },
    });
    return {
      eventId,
      ticketTypeId: added.body.ticketTypes[0].id as string,
    };
  }

  async function bookFreeTickets(
    token: string,
    title: string,
    quantity: number,
  ): Promise<{ orderId: string; eventId: string }> {
    const { eventId, ticketTypeId } = await createPublishedEvent(title);
    const order = await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(token))
      .send({ eventId, items: [{ ticketTypeId, quantity }] })
      .expect(201);
    return { orderId: order.body.id as string, eventId };
  }

  const listNotifications = (token: string) =>
    request(app.getHttpServer())
      .get('/api/notifications')
      .set(auth(token))
      .expect(200);

  const unreadCount = async (token: string): Promise<number> => {
    const res = await request(app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set(auth(token))
      .expect(200);
    return res.body.count as number;
  };

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
  });

  afterAll(async () => {
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

  it('announces a free order with one TICKET_ISSUED carrying render data', async () => {
    const buyer = await register('ATTENDEE', `buyer${seq++}`);
    const title = `Notif Free ${tag}`;
    const { orderId, eventId } = await bookFreeTickets(buyer.token, title, 2);

    const res = await listNotifications(buyer.token);
    expect(res.body.total).toBe(1);
    expect(res.body.unreadCount).toBe(1);

    const item = res.body.items[0] as NotificationItem;
    expect(item.type).toBe('TICKET_ISSUED');
    expect(item.read).toBe(false);
    expect(item.data).toEqual({
      orderId,
      eventId,
      eventTitle: title,
      ticketCount: 2,
    });
    // The contract carries no server-rendered copy; the client renders from
    // type + data.
    expect(item).not.toHaveProperty('title');
    expect(item).not.toHaveProperty('body');
  });

  it('issues no notification for a paid order still awaiting payment', async () => {
    const buyer = await register('ATTENDEE', `buyer${seq++}`);
    const { eventId, ticketTypeId } = await createPublishedEvent(
      `Notif Paid ${tag}`,
      200000,
    );
    await request(app.getHttpServer())
      .post('/api/orders')
      .set(auth(buyer.token))
      .send({ eventId, items: [{ ticketTypeId, quantity: 1 }] })
      .expect(201);

    expect(await unreadCount(buyer.token)).toBe(0);
  });

  it('marks one notification as read', async () => {
    const buyer = await register('ATTENDEE', `buyer${seq++}`);
    await bookFreeTickets(buyer.token, `Notif Read ${tag}`, 1);

    const listed = await listNotifications(buyer.token);
    const id = (listed.body.items[0] as NotificationItem).id;

    const read = await request(app.getHttpServer())
      .patch(`/api/notifications/${id}/read`)
      .set(auth(buyer.token))
      .expect(200);
    expect(read.body.read).toBe(true);
    expect(read.body.type).toBe('TICKET_ISSUED');

    expect(await unreadCount(buyer.token)).toBe(0);
  });

  it('marks every notification as read', async () => {
    const buyer = await register('ATTENDEE', `buyer${seq++}`);
    await bookFreeTickets(buyer.token, `Notif All A ${tag}`, 1);
    await bookFreeTickets(buyer.token, `Notif All B ${tag}`, 1);
    expect(await unreadCount(buyer.token)).toBe(2);

    await request(app.getHttpServer())
      .post('/api/notifications/read-all')
      .set(auth(buyer.token))
      .expect(204);

    expect(await unreadCount(buyer.token)).toBe(0);
  });

  it("does not leak another user's notifications", async () => {
    const buyer = await register('ATTENDEE', `buyer${seq++}`);
    const stranger = await register('ATTENDEE', `buyer${seq++}`);
    await bookFreeTickets(buyer.token, `Notif Private ${tag}`, 1);

    const res = await listNotifications(stranger.token);
    expect(res.body.total).toBe(0);
  });
});
