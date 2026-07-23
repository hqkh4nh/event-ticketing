export type AdminAccountRole = 'ORGANIZER' | 'SCANNER' | 'ATTENDEE';
export type AdminAccountStatus = 'PENDING' | 'ACTIVE' | 'BLOCKED';

export type AdminAccount = {
  id: string;
  fullName: string;
  email: string;
  role: AdminAccountRole;
  status: AdminAccountStatus;
  createdAt: string;
  detailKey:
    | 'minhAnhOrganization'
    | 'namOrganization'
    | 'thaoVyOrganization'
    | 'twoAssignments'
    | 'noAssignment'
    | 'fourTickets';
};

export type AdminEventStatus = 'PUBLISHED' | 'DRAFT' | 'HIDDEN' | 'CANCELLED';

export type AdminEvent = {
  id: string;
  title: string;
  organizerName: string;
  venue: string;
  startAt: string;
  status: AdminEventStatus;
  featured: boolean;
  sold: number;
  capacity: number;
};

export const ADMIN_ACCOUNTS: AdminAccount[] = [
  {
    id: 'account-organizer-1',
    fullName: 'Nguyễn Minh Anh',
    email: 'minhanh.events@example.com',
    role: 'ORGANIZER',
    status: 'PENDING',
    createdAt: '2026-07-23T01:20:00.000Z',
    detailKey: 'minhAnhOrganization',
  },
  {
    id: 'account-organizer-2',
    fullName: 'Trần Hoàng Nam',
    email: 'hoangnam.studio@example.com',
    role: 'ORGANIZER',
    status: 'PENDING',
    createdAt: '2026-07-22T08:45:00.000Z',
    detailKey: 'namOrganization',
  },
  {
    id: 'account-organizer-3',
    fullName: 'Lê Thảo Vy',
    email: 'thaovy.art@example.com',
    role: 'ORGANIZER',
    status: 'PENDING',
    createdAt: '2026-07-21T03:10:00.000Z',
    detailKey: 'thaoVyOrganization',
  },
  {
    id: 'account-scanner-1',
    fullName: 'Phạm Quốc Huy',
    email: 'huy.scanner@example.com',
    role: 'SCANNER',
    status: 'ACTIVE',
    createdAt: '2026-07-12T04:30:00.000Z',
    detailKey: 'twoAssignments',
  },
  {
    id: 'account-scanner-2',
    fullName: 'Võ Ngọc Linh',
    email: 'linh.scanner@example.com',
    role: 'SCANNER',
    status: 'BLOCKED',
    createdAt: '2026-07-08T09:15:00.000Z',
    detailKey: 'noAssignment',
  },
  {
    id: 'account-attendee-1',
    fullName: 'Đỗ Gia Bảo',
    email: 'giabao@example.com',
    role: 'ATTENDEE',
    status: 'ACTIVE',
    createdAt: '2026-07-20T13:40:00.000Z',
    detailKey: 'fourTickets',
  },
];

export const ADMIN_EVENTS: AdminEvent[] = [
  {
    id: 'admin-event-1',
    title: 'Summer Music Festival 2026',
    organizerName: 'Active Organizer',
    venue: 'My Dinh National Stadium, Ha Noi',
    startAt: '2026-08-15T12:00:00.000Z',
    status: 'PUBLISHED',
    featured: true,
    sold: 428,
    capacity: 600,
  },
  {
    id: 'admin-event-2',
    title: 'Vietnam Web Summit 2026',
    organizerName: 'Tech Community Vietnam',
    venue: 'Saigon Exhibition and Convention Center',
    startAt: '2026-08-22T01:30:00.000Z',
    status: 'PUBLISHED',
    featured: true,
    sold: 216,
    capacity: 360,
  },
  {
    id: 'admin-event-3',
    title: 'Contemporary Art Exhibition 2026',
    organizerName: 'Thảo Vy Art Space',
    venue: 'Da Nang Fine Arts Museum',
    startAt: '2026-09-01T02:00:00.000Z',
    status: 'HIDDEN',
    featured: false,
    sold: 78,
    capacity: 200,
  },
  {
    id: 'admin-event-4',
    title: 'Bat Trang Pottery Workshop',
    organizerName: 'Nam Studio & Workshop',
    venue: 'Bat Trang Pottery Village, Ha Noi',
    startAt: '2026-08-20T07:00:00.000Z',
    status: 'DRAFT',
    featured: false,
    sold: 0,
    capacity: 30,
  },
];
