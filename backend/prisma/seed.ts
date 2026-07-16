import 'dotenv/config';

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
    email: 'scanner@example.com',
    fullName: 'Event Scanner',
    role: Role.SCANNER,
    status: UserStatus.ACTIVE,
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

  console.log(
    `Seeded ${users.length} development users and ${events.length} events.`,
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
