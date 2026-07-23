import 'dotenv/config';

import { createHash } from 'crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import {
  EventCategory,
  EventStatus,
  PrismaClient,
  Role,
  UserStatus,
} from '../src/generated/prisma';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const defaultDevelopmentPassword = 'ChangeMe123!';
const seedPassword = process.env.SEED_USER_PASSWORD;

if (process.env.NODE_ENV === 'production' && !seedPassword) {
  throw new Error('SEED_USER_PASSWORD is required in production.');
}

const defaultDevelopmentConnectCode = 'GATEDEMO';
const seedConnectCode = process.env.SEED_CONNECT_CODE;

if (process.env.NODE_ENV === 'production' && !seedConnectCode) {
  throw new Error('SEED_CONNECT_CODE is required in production.');
}

const gateDeviceId = '0198a1f0-2000-7000-8000-000000000001';

const users = [
  {
    email: 'admin@example.com',
    fullName: 'System Admin',
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  },
  {
    email: 'organizer@example.com',
    fullName: 'Active Organizer',
    role: Role.ORGANIZER,
    status: UserStatus.ACTIVE,
  },
  {
    email: 'pending.organizer@example.com',
    fullName: 'Pending Organizer',
    role: Role.ORGANIZER,
    status: UserStatus.PENDING,
  },
  {
    email: 'attendee@example.com',
    fullName: 'Event Attendee',
    role: Role.ATTENDEE,
    status: UserStatus.ACTIVE,
  },
];

const events = [
  {
    id: '0198a1f0-0000-7000-8000-000000000001',
    title: 'Summer Music Festival 2026',
    description:
      'A large summer music festival featuring Vietnamese and international artists.',
    venue: 'My Dinh National Stadium',
    city: 'Ha Noi',
    category: EventCategory.MUSIC,
    featured: true,
    startAt: new Date('2026-08-15T12:00:00.000Z'),
    endAt: new Date('2026-08-15T16:00:00.000Z'),
    coverImageUrl: 'https://picsum.photos/seed/eticket-music-festival/800/600',
    status: EventStatus.PUBLISHED,
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000001',
        name: 'General Admission',
        priceVnd: 200_000n,
        quantityTotal: 500,
      },
      {
        id: '0198a1f0-1000-7000-8000-000000000002',
        name: 'VIP',
        priceVnd: 500_000n,
        quantityTotal: 100,
      },
    ],
  },
  {
    id: '0198a1f0-0000-7000-8000-000000000002',
    title: 'Vietnam Web Summit 2026',
    description:
      'An annual technology conference for engineers, founders, and investors.',
    venue: 'Saigon Exhibition and Convention Center, District 7',
    city: 'Ho Chi Minh City',
    category: EventCategory.TECH,
    featured: true,
    startAt: new Date('2026-08-22T01:30:00.000Z'),
    endAt: new Date('2026-08-22T10:30:00.000Z'),
    coverImageUrl: 'https://picsum.photos/seed/eticket-web-summit/800/600',
    status: EventStatus.PUBLISHED,
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000003',
        name: 'Standard',
        priceVnd: 500_000n,
        quantityTotal: 300,
      },
      {
        id: '0198a1f0-1000-7000-8000-000000000004',
        name: 'Workshop',
        priceVnd: 1_200_000n,
        quantityTotal: 60,
      },
    ],
  },
  {
    id: '0198a1f0-0000-7000-8000-000000000003',
    title: 'Contemporary Art Exhibition 2026',
    description:
      'An exhibition of contemporary paintings and installations by emerging Vietnamese artists.',
    venue: 'Da Nang Fine Arts Museum',
    city: 'Da Nang',
    category: EventCategory.ART,
    featured: false,
    startAt: new Date('2026-09-01T02:00:00.000Z'),
    endAt: new Date('2026-09-01T11:00:00.000Z'),
    coverImageUrl: 'https://picsum.photos/seed/eticket-art-exhibition/800/600',
    status: EventStatus.PUBLISHED,
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000005',
        name: 'General Admission',
        priceVnd: 0n,
        quantityTotal: 200,
      },
    ],
  },
  {
    id: '0198a1f0-0000-7000-8000-000000000004',
    title: 'Autumn City Marathon 2026',
    description:
      'A community running event with 5 km, 10 km, and half-marathon routes through the city center.',
    venue: 'Nguyen Hue Walking Street, District 1',
    city: 'Ho Chi Minh City',
    category: EventCategory.SPORT,
    featured: true,
    startAt: new Date('2026-09-15T22:00:00.000Z'),
    endAt: new Date('2026-09-16T04:00:00.000Z'),
    coverImageUrl: 'https://picsum.photos/seed/eticket-marathon/800/600',
    status: EventStatus.PUBLISHED,
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000006',
        name: '5 km',
        priceVnd: 200_000n,
        quantityTotal: 500,
      },
      {
        id: '0198a1f0-1000-7000-8000-000000000007',
        name: 'Half Marathon',
        priceVnd: 450_000n,
        quantityTotal: 250,
      },
    ],
  },
  {
    id: '0198a1f0-0000-7000-8000-000000000005',
    title: 'Bat Trang Pottery Workshop',
    description:
      'A hands-on pottery workshop where participants shape, decorate, and finish their own ceramic piece.',
    venue: 'Bat Trang Pottery Village, Gia Lam',
    city: 'Ha Noi',
    category: EventCategory.WORKSHOP,
    featured: false,
    startAt: new Date('2026-08-20T07:00:00.000Z'),
    endAt: new Date('2026-08-20T10:00:00.000Z'),
    coverImageUrl: 'https://picsum.photos/seed/eticket-pottery/800/600',
    status: EventStatus.PUBLISHED,
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000008',
        name: 'Individual',
        priceVnd: 150_000n,
        quantityTotal: 30,
      },
    ],
  },
  {
    id: '0198a1f0-0000-7000-8000-000000000006',
    title: 'Saigon Acoustic Night',
    description:
      'An intimate acoustic performance featuring local singer-songwriters and a limited audience.',
    venue: 'Yoko Cafe, District 3',
    city: 'Ho Chi Minh City',
    category: EventCategory.MUSIC,
    featured: false,
    startAt: new Date('2026-10-05T13:00:00.000Z'),
    endAt: new Date('2026-10-05T15:30:00.000Z'),
    coverImageUrl: 'https://picsum.photos/seed/eticket-acoustic/800/600',
    status: EventStatus.PUBLISHED,
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000009',
        name: 'Admission',
        priceVnd: 120_000n,
        quantityTotal: 60,
      },
    ],
  },
];

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function main(): Promise<void> {
  const passwordHash = await hash(
    seedPassword ?? defaultDevelopmentPassword,
    12,
  );

  const seededUsers = await prisma.$transaction(
    users.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {
          fullName: user.fullName,
          passwordHash,
          role: user.role,
          status: user.status,
        },
        create: {
          ...user,
          passwordHash,
        },
      }),
    ),
  );

  const organizer = seededUsers.find(
    (user) => user.email === 'organizer@example.com',
  );

  if (!organizer) {
    throw new Error('Seed organizer was not created.');
  }

  for (const event of events) {
    const { ticketTypes, ...eventData } = event;

    await prisma.event.upsert({
      where: { id: event.id },
      update: { ...eventData, organizerId: organizer.id },
      create: { ...eventData, organizerId: organizer.id },
    });

    await prisma.$transaction(
      ticketTypes.map((ticketType) =>
        prisma.ticketType.upsert({
          where: { id_eventId: { id: ticketType.id, eventId: event.id } },
          update: ticketType,
          create: { ...ticketType, eventId: event.id },
        }),
      ),
    );
  }

  // Demo scanner device: owned by the seed organizer, assigned to the Summer
  // Music Festival, reachable with a known connect code for local testing.
  // Redemption normalizes with trim().toUpperCase(); hash the same form or a
  // lowercase env value would seed a code that can never be redeemed.
  const connectCode = (seedConnectCode ?? defaultDevelopmentConnectCode)
    .trim()
    .toUpperCase();
  const codeHash = createHash('sha256').update(connectCode).digest('hex');
  const codeExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const gateEventId = events[0].id;

  await prisma.user.upsert({
    where: { id: gateDeviceId },
    update: { fullName: 'Gate 1', managedById: organizer.id },
    create: {
      id: gateDeviceId,
      role: Role.SCANNER,
      status: UserStatus.ACTIVE,
      fullName: 'Gate 1',
      managedById: organizer.id,
    },
  });
  await prisma.eventStaff.upsert({
    where: {
      eventId_userId: { eventId: gateEventId, userId: gateDeviceId },
    },
    update: {},
    create: { eventId: gateEventId, userId: gateDeviceId },
  });
  await prisma.staffConnectCode.upsert({
    where: { codeHash },
    update: { redeemedAt: null, expiresAt: codeExpiresAt },
    create: { staffId: gateDeviceId, codeHash, expiresAt: codeExpiresAt },
  });

  console.log(
    `Seeded ${users.length} development users and ${events.length} events.`,
  );
  console.log(
    `Scanner device "Gate 1" ready: connect code ${connectCode} (expires ${codeExpiresAt.toISOString()}).`,
  );
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
