import 'dotenv/config';

import { createHash, createHmac } from 'crypto';

import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'bcryptjs';
import {
  CheckinResult,
  EventCategory,
  EventStatus,
  Locale,
  NotificationType,
  OrderStatus,
  PaymentProvider,
  PaymentStatus,
  PrismaClient,
  Role,
  TicketStatus,
  UserStatus,
  WithdrawalStatus,
} from '../src/generated/prisma';

const databaseUrl = process.env.DATABASE_URL;
const ticketHmacSecret = process.env.TICKET_HMAC_SECRET;

if (!databaseUrl)
  throw new Error('DATABASE_URL is required to seed the database.');
if (!ticketHmacSecret)
  throw new Error('TICKET_HMAC_SECRET is required to seed signed tickets.');

const defaultPassword = 'Demo@123';
const defaultConnectCode = 'GATE2026';
const seedPassword = process.env.SEED_USER_PASSWORD;
const seedConnectCode = process.env.SEED_CONNECT_CODE;

if (
  process.env.NODE_ENV === 'production' &&
  (!seedPassword || !seedConnectCode)
) {
  throw new Error(
    'SEED_USER_PASSWORD and SEED_CONNECT_CODE are required in production.',
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;
const id = (group: number, index: number): string =>
  `019b${group.toString(16).padStart(4, '0')}-0000-7000-8000-${index
    .toString()
    .padStart(12, '0')}`;

function vietnamDate(daysFromToday: number, hour: number, minute = 0): Date {
  const vietnamNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(
      vietnamNow.getUTCFullYear(),
      vietnamNow.getUTCMonth(),
      vietnamNow.getUTCDate() + daysFromToday,
      hour - 7,
      minute,
    ),
  );
}

const USER = {
  admin: id(0, 1),
  organizer: id(0, 2),
  secondOrganizer: id(0, 3),
  pendingOrganizer: id(0, 4),
  pendingOrganizerTwo: id(0, 5),
  blockedOrganizer: id(0, 6),
  attendee: id(0, 7),
  buyerTwo: id(0, 8),
  buyerThree: id(0, 9),
  gateOne: id(0, 10),
  gateTwo: id(0, 11),
} as const;

const EVENT = {
  music: id(1, 1),
  tech: id(1, 2),
  art: id(1, 3),
  running: id(1, 4),
  pottery: id(1, 5),
  settledMusic: id(1, 6),
  review: id(1, 7),
  draft: id(1, 8),
  hidden: id(1, 9),
  cancelled: id(1, 10),
  food: id(1, 11),
  settledTech: id(1, 12),
} as const;

const TYPE = {
  musicEarly: id(2, 1),
  musicStandard: id(2, 2),
  musicVip: id(2, 3),
  techStandard: id(2, 4),
  techWorkshop: id(2, 5),
  artFree: id(2, 6),
  artCurator: id(2, 7),
  runFive: id(2, 8),
  runTen: id(2, 9),
  pottery: id(2, 10),
  settledMusic: id(2, 11),
  review: id(2, 12),
  draft: id(2, 13),
  hidden: id(2, 14),
  cancelled: id(2, 15),
  food: id(2, 16),
  settledTech: id(2, 17),
} as const;

const users = [
  [
    USER.admin,
    'admin@eticket.vn',
    'Nguyễn Minh Anh',
    Role.ADMIN,
    UserStatus.ACTIVE,
    '0901234567',
    47,
  ],
  [
    USER.organizer,
    'organizer@eticket.vn',
    'Trần Hoàng Nhật',
    Role.ORGANIZER,
    UserStatus.ACTIVE,
    '0912345678',
    12,
  ],
  [
    USER.secondOrganizer,
    'organizer.danang@eticket.vn',
    'Lê Thuỳ Dương',
    Role.ORGANIZER,
    UserStatus.ACTIVE,
    '0934567890',
    32,
  ],
  [
    USER.pendingOrganizer,
    'studio.moc@eticket.vn',
    'Phạm Gia Hân',
    Role.ORGANIZER,
    UserStatus.PENDING,
    '0988123456',
    25,
  ],
  [
    USER.pendingOrganizerTwo,
    'thelab.events@eticket.vn',
    'Võ Đức Thành',
    Role.ORGANIZER,
    UserStatus.PENDING,
    '0977123456',
    15,
  ],
  [
    USER.blockedOrganizer,
    'blocked.organizer@eticket.vn',
    'Công ty Sự kiện Ánh Dương',
    Role.ORGANIZER,
    UserStatus.BLOCKED,
    '0966123456',
    11,
  ],
  [
    USER.attendee,
    'attendee@eticket.vn',
    'Huỳnh Quốc Khánh',
    Role.ATTENDEE,
    UserStatus.ACTIVE,
    '0909876543',
    68,
  ],
  [
    USER.buyerTwo,
    'linh.nguyen@eticket.vn',
    'Nguyễn Ngọc Linh',
    Role.ATTENDEE,
    UserStatus.ACTIVE,
    '0903456789',
    44,
  ],
  [
    USER.buyerThree,
    'alex.tran@eticket.vn',
    'Alex Trần',
    Role.ATTENDEE,
    UserStatus.ACTIVE,
    '0923456789',
    53,
  ],
] as const;

type SeedTicketType = {
  id: string;
  name: string;
  priceVnd: bigint;
  quantityTotal: number;
};

type SeedEvent = {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  venue: string;
  city: string;
  category: EventCategory;
  featured: boolean;
  startAt: Date;
  endAt: Date;
  coverImageUrl: string;
  status: EventStatus;
  hiddenReason?: string;
  ticketTypes: SeedTicketType[];
};

const cover = (photoId: string): string =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=1600&q=85`;
const ticketType = (
  typeId: string,
  name: string,
  priceVnd: bigint,
  quantityTotal: number,
): SeedTicketType => ({ id: typeId, name, priceVnd, quantityTotal });

const events: SeedEvent[] = [
  {
    id: EVENT.music,
    organizerId: USER.organizer,
    title: 'Đêm nhạc Sài Gòn: Chạm 2026',
    description:
      'Một đêm nhạc ngoài trời kết nối indie pop, acoustic và những câu chuyện thành phố. Không gian có khu ẩm thực, photobooth và quầy lưu niệm dành cho khán giả.',
    venue: 'Nhà Văn hoá Thanh Niên, Quận 1',
    city: 'Hồ Chí Minh',
    category: EventCategory.MUSIC,
    featured: true,
    startAt: vietnamDate(3, 19),
    endAt: vietnamDate(3, 22, 30),
    coverImageUrl: cover('photo-1501386761578-eac5c94b800a'),
    status: EventStatus.PUBLISHED,
    ticketTypes: [
      ticketType(TYPE.musicEarly, 'Early Bird', 290_000n, 120),
      ticketType(TYPE.musicStandard, 'Standard', 450_000n, 220),
      ticketType(TYPE.musicVip, 'VIP Front Row', 890_000n, 40),
    ],
  },
  {
    id: EVENT.tech,
    organizerId: USER.organizer,
    title: 'Vietnam Future Tech Summit 2026',
    description:
      'Ngày hội dành cho kỹ sư, nhà sáng lập và sinh viên công nghệ với các phiên thảo luận về AI, sản phẩm số và an toàn hệ thống.',
    venue: 'Thiskyhall Sala, Thành phố Thủ Đức',
    city: 'Hồ Chí Minh',
    category: EventCategory.TECH,
    featured: true,
    startAt: vietnamDate(12, 8, 30),
    endAt: vietnamDate(12, 17, 30),
    coverImageUrl: cover('photo-1540575467063-178a50c2df87'),
    status: EventStatus.PUBLISHED,
    ticketTypes: [
      ticketType(TYPE.techStandard, 'Conference Pass', 590_000n, 350),
      ticketType(TYPE.techWorkshop, 'Conference + Workshop', 1_290_000n, 80),
    ],
  },
  {
    id: EVENT.art,
    organizerId: USER.organizer,
    title: 'Triển lãm Sắc Việt Đương Đại',
    description:
      'Tuyển chọn hội hoạ, sắp đặt và nghệ thuật thị giác của các nghệ sĩ trẻ Việt Nam. Vé tham quan phổ thông hoàn toàn miễn phí.',
    venue: 'Bảo tàng Mỹ thuật Đà Nẵng',
    city: 'Đà Nẵng',
    category: EventCategory.ART,
    featured: false,
    startAt: vietnamDate(19, 9),
    endAt: vietnamDate(19, 18),
    coverImageUrl: cover('photo-1549490349-8643362247b5'),
    status: EventStatus.PUBLISHED,
    ticketTypes: [
      ticketType(TYPE.artFree, 'Vé tham quan', 0n, 500),
      ticketType(TYPE.artCurator, 'Tour cùng giám tuyển', 250_000n, 30),
    ],
  },
  {
    id: EVENT.running,
    organizerId: USER.organizer,
    title: 'Ho Chi Minh City Night Run 2026',
    description:
      'Giải chạy đêm qua những tuyến đường trung tâm, có cự ly phù hợp cho người mới và vận động viên phong trào.',
    venue: 'Phố đi bộ Nguyễn Huệ, Quận 1',
    city: 'Hồ Chí Minh',
    category: EventCategory.SPORT,
    featured: true,
    startAt: vietnamDate(28, 18),
    endAt: vietnamDate(28, 23),
    coverImageUrl: cover('photo-1552674605-db6ffd4facb5'),
    status: EventStatus.PUBLISHED,
    ticketTypes: [
      ticketType(TYPE.runFive, 'Cự ly 5 KM', 350_000n, 800),
      ticketType(TYPE.runTen, 'Cự ly 10 KM', 490_000n, 500),
    ],
  },
  {
    id: EVENT.pottery,
    organizerId: USER.organizer,
    title: 'Workshop Gốm Bát Tràng: Tự Tay Tạo Men',
    description:
      'Buổi thực hành nhóm nhỏ, người tham dự tự tạo hình, phối men và mang về một sản phẩm gốm hoàn thiện sau khi nung.',
    venue: 'Không gian Gốm Nhà Mộc, Gia Lâm',
    city: 'Hà Nội',
    category: EventCategory.WORKSHOP,
    featured: false,
    startAt: vietnamDate(8, 14),
    endAt: vietnamDate(8, 17),
    coverImageUrl: cover('photo-1610701596007-11502861dcfa'),
    status: EventStatus.PUBLISHED,
    ticketTypes: [ticketType(TYPE.pottery, 'Một người tham dự', 320_000n, 32)],
  },
  {
    id: EVENT.settledMusic,
    organizerId: USER.organizer,
    title: 'Đêm Acoustic Trên Tầng Thượng',
    description:
      'Đêm nhạc thân mật đã khép lại với những bản acoustic và góc nhìn toàn cảnh thành phố. Sự kiện này tạo doanh thu đã quyết toán để demo rút tiền.',
    venue: 'Rooftop The View, Quận 3',
    city: 'Hồ Chí Minh',
    category: EventCategory.MUSIC,
    featured: false,
    startAt: vietnamDate(-14, 19),
    endAt: vietnamDate(-14, 22),
    coverImageUrl: cover('photo-1524650359799-842906ca1c06'),
    status: EventStatus.PUBLISHED,
    ticketTypes: [
      ticketType(TYPE.settledMusic, 'Vé ngồi tự do', 300_000n, 120),
    ],
  },
  {
    id: EVENT.review,
    organizerId: USER.organizer,
    title: 'Design Systems Vietnam Meetup',
    description:
      'Meetup chia sẻ cách xây dựng design system cho sản phẩm đa nền tảng, kết hợp networking cùng cộng đồng thiết kế và frontend.',
    venue: 'Dreamplex Điện Biên Phủ, Bình Thạnh',
    city: 'Hồ Chí Minh',
    category: EventCategory.TECH,
    featured: false,
    startAt: vietnamDate(35, 18, 30),
    endAt: vietnamDate(35, 21, 30),
    coverImageUrl: cover('photo-1515187029135-18ee286d815b'),
    status: EventStatus.PENDING_REVIEW,
    ticketTypes: [ticketType(TYPE.review, 'Community Pass', 180_000n, 150)],
  },
  {
    id: EVENT.draft,
    organizerId: USER.organizer,
    title: 'Lớp Nhiếp Ảnh Đường Phố Cuối Tuần',
    description:
      'Bản nháp đã có sẵn nội dung và hạng vé để organizer chỉnh sửa rồi bấm gửi duyệt ngay trong phần demo.',
    venue: 'The Workshop Coffee, Quận 1',
    city: 'Hồ Chí Minh',
    category: EventCategory.WORKSHOP,
    featured: false,
    startAt: vietnamDate(42, 8),
    endAt: vietnamDate(42, 12),
    coverImageUrl: cover('photo-1452780212940-6f5c0d14d848'),
    status: EventStatus.DRAFT,
    ticketTypes: [ticketType(TYPE.draft, 'Học viên', 420_000n, 20)],
  },
  {
    id: EVENT.hidden,
    organizerId: USER.organizer,
    title: 'Saigon Creative Market',
    description:
      'Phiên chợ sáng tạo với thương hiệu thủ công và nghệ sĩ độc lập. Sự kiện đang ẩn để demo luồng moderation và khôi phục.',
    venue: 'The Factory Contemporary Arts Centre',
    city: 'Hồ Chí Minh',
    category: EventCategory.ART,
    featured: false,
    startAt: vietnamDate(25, 9),
    endAt: vietnamDate(25, 20),
    coverImageUrl: cover('photo-1488841714725-bb4c32d1ac94'),
    status: EventStatus.HIDDEN,
    hiddenReason:
      'Ảnh bìa cần bổ sung xác nhận bản quyền trước khi tiếp tục quảng bá.',
    ticketTypes: [ticketType(TYPE.hidden, 'Vé vào cổng', 80_000n, 600)],
  },
  {
    id: EVENT.cancelled,
    organizerId: USER.organizer,
    title: 'Sunrise Yoga by the River',
    description:
      'Buổi yoga cộng đồng bên sông đã được huỷ do điều kiện thời tiết, dùng để minh hoạ lịch sử trạng thái sự kiện.',
    venue: 'Công viên bờ sông Thủ Thiêm',
    city: 'Hồ Chí Minh',
    category: EventCategory.SPORT,
    featured: false,
    startAt: vietnamDate(6, 5, 30),
    endAt: vietnamDate(6, 8),
    coverImageUrl: cover('photo-1544367567-0f2fcb009e0b'),
    status: EventStatus.CANCELLED,
    ticketTypes: [ticketType(TYPE.cancelled, 'Thảm tiêu chuẩn', 150_000n, 80)],
  },
  {
    id: EVENT.food,
    organizerId: USER.secondOrganizer,
    title: 'Đà Nẵng Taste & Craft Weekend',
    description:
      'Cuối tuần trải nghiệm ẩm thực địa phương, cà phê đặc sản và các gian hàng thủ công bên bờ biển.',
    venue: 'Công viên Biển Đông, Sơn Trà',
    city: 'Đà Nẵng',
    category: EventCategory.WORKSHOP,
    featured: false,
    startAt: vietnamDate(16, 15),
    endAt: vietnamDate(16, 21),
    coverImageUrl: cover('photo-1555939594-58d7cb561ad1'),
    status: EventStatus.PUBLISHED,
    ticketTypes: [ticketType(TYPE.food, 'Weekend Pass', 120_000n, 400)],
  },
  {
    id: EVENT.settledTech,
    organizerId: USER.secondOrganizer,
    title: 'Central Vietnam Product Meetup',
    description:
      'Một meetup công nghệ đã hoàn thành, có doanh thu lịch sử cho dashboard toàn nền tảng và organizer thứ hai.',
    venue: 'Enouvo Space, Hải Châu',
    city: 'Đà Nẵng',
    category: EventCategory.TECH,
    featured: false,
    startAt: vietnamDate(-24, 18),
    endAt: vietnamDate(-24, 21),
    coverImageUrl: cover('photo-1492684223066-81342ee5ff30'),
    status: EventStatus.PUBLISHED,
    ticketTypes: [ticketType(TYPE.settledTech, 'Meetup Pass', 200_000n, 180)],
  },
];

type SeedOrder = {
  buyerId: string;
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  unitPriceVnd: bigint;
  daysAgo: number;
  status?: OrderStatus;
  ticketStatuses?: TicketStatus[];
};

const paidOrders: SeedOrder[] = [
  {
    buyerId: USER.attendee,
    eventId: EVENT.music,
    ticketTypeId: TYPE.musicStandard,
    quantity: 2,
    unitPriceVnd: 450_000n,
    daysAgo: 1,
    ticketStatuses: [TicketStatus.USED, TicketStatus.ISSUED],
  },
  {
    buyerId: USER.buyerTwo,
    eventId: EVENT.music,
    ticketTypeId: TYPE.musicEarly,
    quantity: 3,
    unitPriceVnd: 290_000n,
    daysAgo: 2,
  },
  {
    buyerId: USER.attendee,
    eventId: EVENT.tech,
    ticketTypeId: TYPE.techWorkshop,
    quantity: 1,
    unitPriceVnd: 1_290_000n,
    daysAgo: 3,
  },
  {
    buyerId: USER.attendee,
    eventId: EVENT.art,
    ticketTypeId: TYPE.artFree,
    quantity: 1,
    unitPriceVnd: 0n,
    daysAgo: 4,
  },
  {
    buyerId: USER.buyerThree,
    eventId: EVENT.music,
    ticketTypeId: TYPE.musicVip,
    quantity: 1,
    unitPriceVnd: 890_000n,
    daysAgo: 5,
  },
  {
    buyerId: USER.buyerTwo,
    eventId: EVENT.tech,
    ticketTypeId: TYPE.techStandard,
    quantity: 2,
    unitPriceVnd: 590_000n,
    daysAgo: 6,
  },
  {
    buyerId: USER.buyerThree,
    eventId: EVENT.food,
    ticketTypeId: TYPE.food,
    quantity: 2,
    unitPriceVnd: 120_000n,
    daysAgo: 7,
  },
  {
    buyerId: USER.buyerThree,
    eventId: EVENT.running,
    ticketTypeId: TYPE.runTen,
    quantity: 2,
    unitPriceVnd: 490_000n,
    daysAgo: 8,
  },
  {
    buyerId: USER.attendee,
    eventId: EVENT.running,
    ticketTypeId: TYPE.runFive,
    quantity: 1,
    unitPriceVnd: 350_000n,
    daysAgo: 9,
  },
  {
    buyerId: USER.buyerTwo,
    eventId: EVENT.pottery,
    ticketTypeId: TYPE.pottery,
    quantity: 2,
    unitPriceVnd: 320_000n,
    daysAgo: 10,
  },
  {
    buyerId: USER.buyerTwo,
    eventId: EVENT.music,
    ticketTypeId: TYPE.musicStandard,
    quantity: 2,
    unitPriceVnd: 450_000n,
    daysAgo: 11,
  },
  {
    buyerId: USER.attendee,
    eventId: EVENT.settledMusic,
    ticketTypeId: TYPE.settledMusic,
    quantity: 2,
    unitPriceVnd: 300_000n,
    daysAgo: 13,
  },
  {
    buyerId: USER.buyerTwo,
    eventId: EVENT.settledMusic,
    ticketTypeId: TYPE.settledMusic,
    quantity: 4,
    unitPriceVnd: 300_000n,
    daysAgo: 14,
  },
  {
    buyerId: USER.buyerThree,
    eventId: EVENT.settledMusic,
    ticketTypeId: TYPE.settledMusic,
    quantity: 3,
    unitPriceVnd: 300_000n,
    daysAgo: 16,
  },
  {
    buyerId: USER.buyerTwo,
    eventId: EVENT.settledTech,
    ticketTypeId: TYPE.settledTech,
    quantity: 4,
    unitPriceVnd: 200_000n,
    daysAgo: 22,
  },
];

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
const seededTicketIds: string[][] = [];

async function seedOrder(order: SeedOrder, index: number): Promise<void> {
  const status = order.status ?? OrderStatus.PAID;
  const paidAt =
    status === OrderStatus.PAID
      ? new Date(Date.now() - order.daysAgo * DAY_MS)
      : null;
  const createdAt = new Date(
    Date.now() - order.daysAgo * DAY_MS - 10 * 60 * 1000,
  );
  const expiresAt =
    status === OrderStatus.PENDING
      ? new Date(Date.now() + 7 * DAY_MS)
      : new Date(createdAt.getTime() + 15 * 60 * 1000);
  const orderId = id(3, index + 1);
  const orderItemId = id(4, index + 1);
  const transferCode = `DM${(index + 1).toString().padStart(6, '0')}`;
  const totalVnd = order.unitPriceVnd * BigInt(order.quantity);
  const ticketIds: string[] = [];

  await prisma.order.create({
    data: {
      id: orderId,
      buyerId: order.buyerId,
      eventId: order.eventId,
      status,
      totalVnd,
      transferCode,
      clientRequestId: `demo-order-${index + 1}`,
      expiresAt,
      paidAt,
      expiredAt: status === OrderStatus.EXPIRED ? new Date() : null,
      createdAt,
    },
  });

  await prisma.orderItem.create({
    data: {
      id: orderItemId,
      orderId,
      eventId: order.eventId,
      ticketTypeId: order.ticketTypeId,
      quantity: order.quantity,
      unitPriceVnd: order.unitPriceVnd,
    },
  });

  if (status === OrderStatus.PAID) {
    for (let sequence = 1; sequence <= order.quantity; sequence += 1) {
      const ticketId = id(5, index * 10 + sequence);
      const code = `ETK_DEMO_${(index + 1).toString().padStart(2, '0')}_${sequence}`;
      const signature = createHmac('sha256', ticketHmacSecret!)
        .update(code)
        .digest('base64url');
      const ticketStatus =
        order.ticketStatuses?.[sequence - 1] ?? TicketStatus.ISSUED;
      await prisma.ticket.create({
        data: {
          id: ticketId,
          orderItemId,
          sequence,
          code,
          signature,
          status: ticketStatus,
          issuedAt: paidAt!,
          usedAt:
            ticketStatus === TicketStatus.USED
              ? new Date(Date.now() - 2 * 60 * 60 * 1000)
              : null,
          usedByStaffId:
            ticketStatus === TicketStatus.USED ? USER.gateOne : null,
        },
      });
      ticketIds.push(ticketId);
    }

    if (totalVnd > 0n) {
      await prisma.payment.create({
        data: {
          orderId,
          provider: PaymentProvider.SEPAY,
          sepayTxnId: `DEMO-MATCHED-${index + 1}`,
          amountVnd: totalVnd,
          transferContent: transferCode,
          status: PaymentStatus.MATCHED,
          rawPayload: { source: 'demo-seed', bank: 'MB', transferCode },
          receivedAt: paidAt!,
          matchedAt: paidAt!,
        },
      });
    }

    await prisma.notification.create({
      data: {
        userId: order.buyerId,
        type: NotificationType.TICKET_ISSUED,
        data: {
          orderId,
          eventId: order.eventId,
          eventTitle: events.find((event) => event.id === order.eventId)?.title,
          ticketCount: order.quantity,
          url: '/tickets',
        },
        dedupeKey: `ticket-issued:${orderId}`,
        read: index > 2,
        createdAt: paidAt!,
      },
    });
  }

  seededTicketIds.push(ticketIds);
}

async function main(): Promise<void> {
  await prisma.$executeRaw`TRUNCATE TABLE "User" RESTART IDENTITY CASCADE`;

  const passwordHash = await hash(seedPassword ?? defaultPassword, 12);

  await prisma.user.createMany({
    data: users.map(
      ([userId, email, fullName, role, status, phone, avatar]) => ({
        id: userId,
        email,
        fullName,
        passwordHash,
        role,
        status,
        phone,
        avatarUrl: `https://i.pravatar.cc/320?img=${avatar}`,
        locale: email === 'alex.tran@eticket.vn' ? Locale.EN : Locale.VI,
        emailVerifiedAt: new Date(),
      }),
    ),
  });

  await prisma.user.createMany({
    data: [
      {
        id: USER.gateOne,
        fullName: 'Cổng chính A',
        role: Role.SCANNER,
        status: UserStatus.ACTIVE,
        managedById: USER.organizer,
        locale: Locale.VI,
      },
      {
        id: USER.gateTwo,
        fullName: 'Cổng VIP B',
        role: Role.SCANNER,
        status: UserStatus.ACTIVE,
        managedById: USER.organizer,
        locale: Locale.VI,
      },
    ],
  });

  for (const event of events) {
    const { ticketTypes, ...eventData } = event;
    await prisma.event.create({ data: eventData });
    await prisma.ticketType.createMany({
      data: ticketTypes.map((type) => ({ ...type, eventId: event.id })),
    });
  }

  await prisma.eventStaff.createMany({
    data: [
      { eventId: EVENT.music, userId: USER.gateOne },
      { eventId: EVENT.music, userId: USER.gateTwo },
    ],
  });

  const connectCode = (seedConnectCode ?? defaultConnectCode)
    .trim()
    .toUpperCase();
  await prisma.staffConnectCode.create({
    data: {
      staffId: USER.gateOne,
      codeHash: createHash('sha256').update(connectCode).digest('hex'),
      expiresAt: new Date(Date.now() + 30 * DAY_MS),
    },
  });

  for (const [index, order] of paidOrders.entries())
    await seedOrder(order, index);

  await seedOrder(
    {
      buyerId: USER.attendee,
      eventId: EVENT.tech,
      ticketTypeId: TYPE.techStandard,
      quantity: 1,
      unitPriceVnd: 590_000n,
      daysAgo: 0,
      status: OrderStatus.PENDING,
    },
    paidOrders.length,
  );
  await seedOrder(
    {
      buyerId: USER.buyerThree,
      eventId: EVENT.music,
      ticketTypeId: TYPE.musicEarly,
      quantity: 1,
      unitPriceVnd: 290_000n,
      daysAgo: 2,
      status: OrderStatus.EXPIRED,
    },
    paidOrders.length + 1,
  );

  const usedTicketId = seededTicketIds[0]?.[0];
  if (!usedTicketId)
    throw new Error('The demo check-in ticket was not created.');

  await prisma.checkinLog.createMany({
    data: [
      {
        ticketId: usedTicketId,
        eventId: EVENT.music,
        staffId: USER.gateOne,
        result: CheckinResult.VALID,
        rawPayload: 'demo-valid-ticket',
        scannedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        ticketId: usedTicketId,
        eventId: EVENT.music,
        staffId: USER.gateOne,
        result: CheckinResult.ALREADY_USED,
        rawPayload: 'demo-valid-ticket',
        scannedAt: new Date(Date.now() - 90 * 60 * 1000),
      },
      {
        eventId: EVENT.music,
        staffId: USER.gateTwo,
        result: CheckinResult.INVALID,
        rawPayload: 'invalid.demo.payload',
        scannedAt: new Date(Date.now() - 45 * 60 * 1000),
      },
      {
        ticketId: seededTicketIds[2]?.[0],
        eventId: EVENT.music,
        staffId: USER.gateTwo,
        result: CheckinResult.WRONG_EVENT,
        rawPayload: 'ticket-from-tech-event',
        scannedAt: new Date(Date.now() - 20 * 60 * 1000),
      },
    ],
  });

  const expiredOrderId = id(3, paidOrders.length + 2);
  await prisma.payment.createMany({
    data: [
      {
        orderId: expiredOrderId,
        provider: PaymentProvider.SEPAY,
        sepayTxnId: 'DEMO-REVIEW-LATE',
        amountVnd: 290_000n,
        transferContent: `DM${(paidOrders.length + 2).toString().padStart(6, '0')}`,
        status: PaymentStatus.REVIEW_REQUIRED,
        reviewReason: 'Payment received for order in status EXPIRED.',
        rawPayload: { source: 'demo-seed', case: 'late-payment' },
        receivedAt: new Date(Date.now() - 80 * 60 * 1000),
      },
      {
        provider: PaymentProvider.SEPAY,
        sepayTxnId: 'DEMO-REVIEW-UNMATCHED',
        amountVnd: 777_000n,
        transferContent: 'NOORDER77',
        status: PaymentStatus.UNMATCHED,
        reviewReason: 'No order matched this transfer code and amount.',
        rawPayload: { source: 'demo-seed', case: 'unknown-transfer' },
        receivedAt: new Date(Date.now() - 50 * 60 * 1000),
      },
      {
        provider: PaymentProvider.SEPAY,
        sepayTxnId: 'DEMO-REVIEW-RESOLVED',
        amountVnd: 120_000n,
        transferContent: 'WRONGOLD',
        status: PaymentStatus.UNMATCHED,
        reviewReason: 'No order matched this transfer code and amount.',
        rawPayload: { source: 'demo-seed', case: 'resolved' },
        receivedAt: new Date(Date.now() - 5 * DAY_MS),
        reviewedAt: new Date(Date.now() - 4 * DAY_MS),
        reviewedById: USER.admin,
        adminNote:
          'Buyer confirmed the wrong transfer content; refund recorded as RF-DEMO-001.',
      },
    ],
  });

  await prisma.withdrawalRequest.createMany({
    data: [
      {
        id: id(6, 1),
        organizerId: USER.organizer,
        amountVnd: 500_000n,
        status: WithdrawalStatus.PENDING,
        bankName: 'MB Bank',
        bankAccountNumber: '090123456789',
        bankAccountHolder: 'TRAN HOANG NHAT',
        organizerNote: 'Đối soát doanh thu sự kiện acoustic tháng này.',
        createdAt: new Date(Date.now() - DAY_MS),
      },
      {
        id: id(6, 2),
        organizerId: USER.organizer,
        amountVnd: 300_000n,
        status: WithdrawalStatus.PAID,
        bankName: 'MB Bank',
        bankAccountNumber: '090123456789',
        bankAccountHolder: 'TRAN HOANG NHAT',
        organizerNote: 'Rút thử nghiệm đợt đầu.',
        reviewedById: USER.admin,
        reviewedAt: new Date(Date.now() - 10 * DAY_MS),
        paidAt: new Date(Date.now() - 9 * DAY_MS),
        transferReference: 'MB-DEMO-20260802',
        adminNote: 'Transferred and reconciled.',
        createdAt: new Date(Date.now() - 12 * DAY_MS),
      },
      {
        id: id(6, 3),
        organizerId: USER.secondOrganizer,
        amountVnd: 400_000n,
        status: WithdrawalStatus.APPROVED,
        bankName: 'Vietcombank',
        bankAccountNumber: '0071000123456',
        bankAccountHolder: 'LE THUY DUONG',
        organizerNote: 'Thanh toán chi phí địa điểm meetup.',
        reviewedById: USER.admin,
        reviewedAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * DAY_MS),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: USER.admin,
        type: NotificationType.EVENT_SUBMITTED,
        data: {
          eventId: EVENT.review,
          eventTitle: 'Design Systems Vietnam Meetup',
          organizerId: USER.organizer,
          url: '/admin/events?status=PENDING_REVIEW',
        },
        read: false,
      },
      {
        userId: USER.admin,
        type: NotificationType.PAYMENT_REVIEW_REQUIRED,
        data: {
          paymentId: 'DEMO-REVIEW-LATE',
          orderId: expiredOrderId,
          eventTitle: 'Đêm nhạc Sài Gòn: Chạm 2026',
          url: '/admin/payments/review',
        },
        read: false,
      },
      {
        userId: USER.admin,
        type: NotificationType.WITHDRAWAL_SUBMITTED,
        data: {
          withdrawalId: id(6, 1),
          organizerId: USER.organizer,
          organizerName: 'Trần Hoàng Nhật',
          amountVnd: 500000,
          url: '/admin/withdrawals?status=PENDING',
        },
        read: false,
      },
      {
        userId: USER.organizer,
        type: NotificationType.EVENT_FEATURED,
        data: {
          eventId: EVENT.music,
          eventTitle: 'Đêm nhạc Sài Gòn: Chạm 2026',
          url: `/organizer/events/${EVENT.music}`,
        },
        read: false,
      },
      {
        userId: USER.organizer,
        type: NotificationType.EVENT_HIDDEN,
        data: {
          eventId: EVENT.hidden,
          eventTitle: 'Saigon Creative Market',
          reason:
            'Ảnh bìa cần bổ sung xác nhận bản quyền trước khi tiếp tục quảng bá.',
          url: `/organizer/events/${EVENT.hidden}`,
        },
        read: false,
      },
      {
        userId: USER.secondOrganizer,
        type: NotificationType.WITHDRAWAL_APPROVED,
        data: {
          withdrawalId: id(6, 3),
          amountVnd: 400000,
          url: '/organizer/withdrawals',
        },
        read: false,
      },
    ],
  });

  console.log(
    `Seeded ${users.length + 2} users, ${events.length} events, ${paidOrders.length + 2} orders, and ${seededTicketIds.flat().length} tickets.`,
  );
  console.log(`Demo login password: ${seedPassword ?? defaultPassword}`);
  console.log(`Scanner connect code: ${connectCode}`);
  console.log(`Check-in event id: ${EVENT.music}`);
  console.log(
    `Fresh QR payload: ETK_DEMO_01_2.${createHmac('sha256', ticketHmacSecret!).update('ETK_DEMO_01_2').digest('base64url')}`,
  );
  console.log(
    `Used QR payload: ETK_DEMO_01_1.${createHmac('sha256', ticketHmacSecret!).update('ETK_DEMO_01_1').digest('base64url')}`,
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
