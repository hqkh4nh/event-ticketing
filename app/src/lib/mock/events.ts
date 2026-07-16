/**
 * Stand-in data for the Events API (AC-3, AC-4) until the backend ships.
 *
 * The shapes mirror what the API is expected to return, so wiring the real
 * endpoints should replace this module alone and leave the screens untouched.
 */

/**
 * TODO: `category`, `featured` and `city` have no counterpart on the Prisma
 * `Event` model. They exist here only so the screens match the approved design.
 * Before wiring the real API, either add all three to the schema or delete
 * every reference to them.
 */
export type EventCategory = 'MUSIC' | 'TECH' | 'ART' | 'SPORT' | 'WORKSHOP';

/** Mirrors the future EventSummaryDto returned by `GET /api/events`. */
export type EventSummary = {
  id: string;
  title: string;
  city: string;
  startAt: string;
  coverImageUrl: string | null;
  /** Lowest ticket price in VND; 0 means free. Derived from the event's ticket types. */
  minPriceVnd: number;
  category: EventCategory;
  featured: boolean;
};

/** Mirrors the future TicketTypeDto nested in the event detail response. */
export type TicketTypeSummary = {
  id: string;
  name: string;
  priceVnd: number;
  /** Seats still purchasable: quantityTotal minus reserved and paid items. */
  quantityRemaining: number;
};

/** Mirrors the future EventDetailDto returned by `GET /api/events/:id`. */
export type EventDetail = EventSummary & {
  description: string;
  venue: string;
  endAt: string;
  ticketTypes: TicketTypeSummary[];
};

const COVER = (seed: string) => `https://picsum.photos/seed/${seed}/800/600`;

export const MOCK_EVENTS: EventDetail[] = [
  {
    id: '0198a1f0-0000-7000-8000-000000000001',
    title: 'Lễ hội Âm nhạc Mùa Hè 2026',
    venue: 'Sân vận động Mỹ Đình, Hà Nội',
    city: 'Hà Nội',
    startAt: '2026-08-15T19:00:00+07:00',
    endAt: '2026-08-15T23:00:00+07:00',
    coverImageUrl: COVER('eticket-music-festival'),
    minPriceVnd: 200_000,
    category: 'MUSIC',
    featured: true,
    description:
      'Lễ hội âm nhạc mùa hè bùng nổ nhất năm 2026 với sự góp mặt của các nghệ sĩ hàng đầu Việt Nam và quốc tế. Trải nghiệm không gian âm nhạc sôi động, ánh sáng hoành tráng và những khoảnh khắc đáng nhớ cùng hàng ngàn bạn trẻ đam mê âm nhạc.',
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000001',
        name: 'Vé Thường',
        priceVnd: 200_000,
        quantityRemaining: 50,
      },
      {
        id: '0198a1f0-1000-7000-8000-000000000002',
        name: 'Vé VIP',
        priceVnd: 500_000,
        quantityRemaining: 10,
      },
    ],
  },
  {
    id: '0198a1f0-0000-7000-8000-000000000002',
    title: 'Vietnam Web Summit 2026',
    venue: 'Trung tâm Hội nghị SECC, Quận 7, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    startAt: '2026-08-22T08:30:00+07:00',
    endAt: '2026-08-22T17:30:00+07:00',
    coverImageUrl: COVER('eticket-web-summit'),
    minPriceVnd: 500_000,
    category: 'TECH',
    featured: true,
    description:
      'Hội nghị công nghệ thường niên quy tụ các kỹ sư, nhà sáng lập và nhà đầu tư trong hệ sinh thái công nghệ Việt Nam. Hai sân khấu song song với hơn 30 bài chia sẻ về AI, hạ tầng đám mây và sản phẩm số.',
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000003',
        name: 'Vé Tiêu chuẩn',
        priceVnd: 500_000,
        quantityRemaining: 120,
      },
      {
        id: '0198a1f0-1000-7000-8000-000000000004',
        name: 'Vé Workshop',
        priceVnd: 1_200_000,
        quantityRemaining: 0,
      },
    ],
  },
  {
    id: '0198a1f0-0000-7000-8000-000000000003',
    title: 'Triển lãm Nghệ thuật Đương đại',
    venue: 'Bảo tàng Mỹ thuật Đà Nẵng, 78 Lê Duẩn',
    city: 'Đà Nẵng',
    startAt: '2026-09-01T09:00:00+07:00',
    endAt: '2026-09-01T18:00:00+07:00',
    coverImageUrl: COVER('eticket-art-exhibition'),
    minPriceVnd: 0,
    category: 'ART',
    featured: false,
    description:
      'Triển lãm giới thiệu hơn 40 tác phẩm sắp đặt và hội hoạ của các nghệ sĩ trẻ miền Trung. Vào cửa tự do, khách tham quan chỉ cần đăng ký vé để ban tổ chức kiểm soát số lượng theo khung giờ.',
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000005',
        name: 'Vé tham quan',
        priceVnd: 0,
        quantityRemaining: 200,
      },
    ],
  },
  {
    id: '0198a1f0-0000-7000-8000-000000000004',
    title: 'Giải chạy Marathon Mùa Thu',
    venue: 'Phố đi bộ Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
    city: 'TP. Hồ Chí Minh',
    startAt: '2026-09-15T05:00:00+07:00',
    endAt: '2026-09-15T11:00:00+07:00',
    coverImageUrl: COVER('eticket-marathon'),
    minPriceVnd: 200_000,
    category: 'SPORT',
    featured: false,
    description:
      'Giải chạy phong trào với ba cự ly 5km, 10km và 21km. Đường chạy khép kín qua trung tâm thành phố, có trạm tiếp nước mỗi 2km và đội ngũ y tế túc trực toàn tuyến.',
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000006',
        name: 'Cự ly 5km',
        priceVnd: 200_000,
        quantityRemaining: 300,
      },
      {
        id: '0198a1f0-1000-7000-8000-000000000007',
        name: 'Cự ly 21km',
        priceVnd: 450_000,
        quantityRemaining: 25,
      },
    ],
  },
  {
    id: '0198a1f0-0000-7000-8000-000000000005',
    title: 'Workshop Làm Gốm Thủ Công',
    venue: 'Xưởng gốm Bát Tràng, Gia Lâm, Hà Nội',
    city: 'Hà Nội',
    startAt: '2026-08-20T14:00:00+07:00',
    endAt: '2026-08-20T17:00:00+07:00',
    coverImageUrl: COVER('eticket-pottery'),
    minPriceVnd: 150_000,
    category: 'WORKSHOP',
    featured: false,
    description:
      'Buổi thực hành ba tiếng cùng nghệ nhân làng gốm Bát Tràng. Học viên tự tay tạo hình, trang trí và mang về sản phẩm của mình sau khi nung.',
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000008',
        name: 'Vé cá nhân',
        priceVnd: 150_000,
        quantityRemaining: 12,
      },
    ],
  },
  {
    id: '0198a1f0-0000-7000-8000-000000000006',
    title: 'Đêm nhạc Acoustic Sài Gòn',
    venue: 'Yoko Café, 22A Nguyễn Thị Diệu, Quận 3',
    city: 'TP. Hồ Chí Minh',
    startAt: '2026-10-05T20:00:00+07:00',
    endAt: '2026-10-05T22:30:00+07:00',
    coverImageUrl: COVER('eticket-acoustic'),
    minPriceVnd: 120_000,
    category: 'MUSIC',
    featured: false,
    description:
      'Đêm nhạc mộc trong không gian ấm cúng với sức chứa giới hạn 60 khách. Giá vé đã bao gồm một đồ uống tự chọn.',
    ticketTypes: [
      {
        id: '0198a1f0-1000-7000-8000-000000000009',
        name: 'Vé vào cửa',
        priceVnd: 120_000,
        quantityRemaining: 8,
      },
    ],
  },
];

/** Events sorted soonest-first, the order `GET /api/events` is expected to use. */
export const MOCK_EVENT_SUMMARIES: EventSummary[] = [...MOCK_EVENTS].sort((a, b) =>
  a.startAt.localeCompare(b.startAt),
);

export function findMockEvent(id: string): EventDetail | undefined {
  return MOCK_EVENTS.find((event) => event.id === id);
}
