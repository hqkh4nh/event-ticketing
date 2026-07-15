import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import { PrismaClient, Role, UserStatus } from '../src/generated/prisma';

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
    emailNormalized: 'admin@example.com',
    fullName: 'System Admin',
    role: Role.ADMIN,
    status: UserStatus.ACTIVE,
  },
  {
    email: 'organizer@example.com',
    emailNormalized: 'organizer@example.com',
    fullName: 'Active Organizer',
    role: Role.ORGANIZER,
    status: UserStatus.ACTIVE,
  },
  {
    email: 'pending.organizer@example.com',
    emailNormalized: 'pending.organizer@example.com',
    fullName: 'Pending Organizer',
    role: Role.ORGANIZER,
    status: UserStatus.PENDING,
  },
  {
    email: 'scanner@example.com',
    emailNormalized: 'scanner@example.com',
    fullName: 'Event Scanner',
    role: Role.SCANNER,
    status: UserStatus.ACTIVE,
  },
  {
    email: 'attendee@example.com',
    emailNormalized: 'attendee@example.com',
    fullName: 'Event Attendee',
    role: Role.ATTENDEE,
    status: UserStatus.ACTIVE,
  },
];

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function main(): Promise<void> {
  const passwordHash = await hash(
    seedPassword ?? defaultDevelopmentPassword,
    12,
  );

  await prisma.$transaction(
    users.map((user) =>
      prisma.user.upsert({
        where: { emailNormalized: user.emailNormalized },
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

  console.log(`Seeded ${users.length} development users.`);
}

void main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
