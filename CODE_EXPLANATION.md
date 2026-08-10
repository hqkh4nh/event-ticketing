# Giải thích các đoạn code dễ bị hỏi khi vấn đáp

Các đoạn dưới đây được rút gọn từ source để dễ học. Khi trình bày, hãy mở đúng file/function ghi ở đầu phần; đừng cố học thuộc từng ký tự.

## 1. Vì sao có `ValidationPipe` toàn cục?

**File:** `backend/src/main.ts` – `bootstrap()`

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) => new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Request validation failed.',
      fields: errors.map(...),
    }),
  }),
);
```

**Nó làm gì?** Mọi request body/query đi qua DTO validation trước khi đến controller. Field lạ bị từ chối, value được transform và lỗi có shape đồng nhất.

**Vì sao viết vậy?** Tránh việc từng endpoint tự parse/check lặp lại; UI dùng `code`/`fields` để render lỗi đúng ngôn ngữ.

**Nếu bỏ `forbidNonWhitelisted`?** Field lạ có thể bị lặng lẽ bỏ qua; khó debug API sai và giảm lớp bảo vệ chống mass assignment.

**Câu hỏi mẫu:** “`whitelist` khác `forbidNonWhitelisted`?”

**Trả lời:** whitelist bỏ field không khai báo, còn forbid biến việc gửi field đó thành lỗi 400. Project bật cả hai để contract chặt hơn.

## 2. JWT nhưng vẫn có `AuthSession`

**File:** `backend/src/modules/auth/auth.service.ts` – `buildSession()`; `jwt.strategy.ts` – `validate()`

```ts
const sessionId = randomUUID();
const accessToken = this.jwt.sign({ sub: user.id, sid: sessionId }, ...);
await this.prisma.authSession.create({
  data: { id: sessionId, userId: user.id, expiresAt },
});
```

Sau đó strategy query session còn hiệu lực:

```ts
where: {
  id: payload.sid,
  userId: payload.sub,
  revokedAt: null,
  expiresAt: { gt: new Date() },
}
```

**Nó làm gì?** JWT xác định token được server ký, còn DB session xác định token có bị revoke chưa.

**Vì sao viết vậy?** JWT thuần stateless khó logout ngay: token đã phát vẫn valid đến `exp`. Hàng `AuthSession` là denylist/allowlist stateful theo session, nên logout và password change có hiệu lực ngay ở HTTP API.

**Nếu chỉ dùng JWT?** Đơn giản hơn, ít query DB hơn, nhưng không revoke từng token tức thì trừ khi đổi JWT secret toàn hệ thống hoặc thêm blacklist khác.

## 3. `DUMMY_HASH` chống lộ email tồn tại

**File:** `backend/src/modules/auth/auth.service.ts` – `login()`

```ts
const hash = user?.passwordHash ?? DUMMY_HASH;
const passwordOk = await bcrypt.compare(dto.password, hash);

if (!user || !user.passwordHash || !passwordOk) {
  throw new UnauthorizedException(...);
}
```

**Nó làm gì?** Khi email không tồn tại, vẫn thực hiện bcrypt compare với dummy hash.

**Vì sao?** Nếu không, “email không tồn tại” trả nhanh hơn “sai password” và attacker có thể đo thời gian để suy đoán account. Đây là giảm timing side-channel, không phải bảo vệ duy nhất.

**Nếu viết `if (!user) return` trước compare?** Nhanh hơn chút nhưng tạo timing difference.

## 4. Một lần kết nối scanner bằng CAS

**File:** `AuthService.staffConnect()`

```ts
const redeemed = await this.prisma.staffConnectCode.updateMany({
  where: { id: record.id, redeemedAt: null },
  data: { redeemedAt: new Date() },
});
if (redeemed.count !== 1) throw this.invalidConnectCode();
```

**Nó làm gì?** Chỉ redeem code nếu nó vẫn chưa được redeem ngay tại thời điểm update.

**Vì sao không `find -> update` bình thường?** Hai phone có thể cùng đọc `redeemedAt=null`; cả hai sẽ login nếu update không condition. `WHERE redeemedAt IS NULL` làm check và write atomic.

**Nếu count là 0?** Code đã expire/được dùng/đua bởi request khác; cùng trả `INVALID_CONNECT_CODE` để không lộ trạng thái code cho attacker.

## 5. State machine event

**File:** `backend/src/modules/events/events-organizer.service.ts` – `ALLOWED_TRANSITIONS`, `assertTransition()`

```ts
const ALLOWED_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: [EventStatus.PENDING_REVIEW],
  PENDING_REVIEW: [EventStatus.DRAFT, EventStatus.PUBLISHED],
  PUBLISHED: [EventStatus.DRAFT, EventStatus.CANCELLED],
  CANCELLED: [],
  HIDDEN: [EventStatus.DRAFT],
};

export function assertTransition(from, to) {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new ConflictException(...);
  }
}
```

**Nó làm gì?** Mã hóa graph chuyển status hợp lệ ở một nơi.

**Vì sao?** Không có state machine, client có thể cố `DRAFT -> PUBLISHED`, hoặc logic chuyển trạng thái rải khắp controller. Với bảng này, luật dễ review/test.

**Lưu ý khi trả lời:** Admin approve là path `PENDING_REVIEW -> PUBLISHED`; organizer không có API direct publish.

## 6. Khóa event rồi gửi duyệt

**File:** `EventsOrganizerService.publish()`

```ts
await this.prisma.$transaction(async (tx) => {
  await tx.$queryRaw`
    SELECT id FROM "Event"
    WHERE id = ${id}::uuid AND "organizerId" = ${organizerId}::uuid
    FOR UPDATE
  `;
  const event = await tx.event.findFirst(...);
  assertTransition(event.status, EventStatus.PENDING_REVIEW);

  const ticketTypeCount = await tx.ticketType.count({ where: { eventId: id } });
  if (ticketTypeCount === 0) throw new ConflictException(...);

  const changed = await tx.event.updateMany({
    where: { id, organizerId, status: EventStatus.DRAFT },
    data: { status: EventStatus.PENDING_REVIEW },
  });
  // create notifications for active admins in same transaction
});
```

**Nó làm gì?** Serialize submit với thao tác edit ticket type, đảm bảo event đang draft và có ít nhất một hạng vé, rồi chuyển sang pending review và tạo notification atomically.

**Tại sao vừa `FOR UPDATE` vừa `updateMany` condition?** Lock serialize các transaction hợp tác với cùng lock. Guarded update vẫn là defense rõ ràng cho state transition, trả conflict nếu row không còn đúng state.

**Nếu tạo notification sau transaction?** Có thể event đã pending review nhưng process crash trước notification; đặt trong transaction giúp hai thay đổi cùng commit/rollback.

## 7. Không cho giảm số lượng dưới số vé đã giữ/bán

**File:** `EventsOrganizerService.updateTicketType()` và `assertTicketQuantityNotBelowReserved()`

```ts
const reserved = await tx.orderItem.aggregate({
  where: {
    eventId,
    ticketTypeId,
    order: { status: { in: ['PENDING', 'PAID'] } },
  },
  _sum: { quantity: true },
});

if (dto.quantityTotal < (reserved._sum.quantity ?? 0)) {
  throw new ConflictException(...);
}
```

**Nó làm gì?** Không để organizer sửa capacity thấp hơn reservation hiện tại.

**Vì sao PENDING cũng tính?** Pending giữ inventory, nếu không tính thì user có thể đang checkout nhưng organizer giảm capacity dưới số ghế đã hứa.

**Nếu bỏ check?** `quantityTotal` có thể nhỏ hơn số ticket đã paid/pending; dashboard và availability trở nên vô nghĩa.

## 8. Merge duplicate ticket items

**File:** `OrdersService.create()`

```ts
const wanted = new Map<string, number>();
for (const item of dto.items) {
  wanted.set(
    item.ticketTypeId,
    (wanted.get(item.ticketTypeId) ?? 0) + item.quantity,
  );
}
```

**Nó làm gì?** Chuyển request `[{VIP,1},{VIP,2}]` thành `{VIP:3}`.

**Vì sao?** Database có unique `[orderId,ticketTypeId]`, mỗi hạng chỉ nên thành một `OrderItem`. Tính availability/tổng tiền một lần, nhất quán.

**Nếu không merge?** Insert item thứ hai lỗi unique hoặc phải tạo logic duplicate phức tạp, trong khi business semantics vẫn chỉ là tổng số VIP.

## 9. Chống oversell bằng row lock có thứ tự

**File:** `OrdersService.create()`

```ts
await tx.$queryRaw`
  SELECT id FROM "TicketType"
  WHERE id = ANY(${ticketTypeIds}::uuid[])
  ORDER BY id
  FOR UPDATE
`;
```

Sau đó:

```ts
reserved = SUM(OrderItem.quantity)
where order.status in (PENDING, PAID)
available = quantityTotal - reserved
```

**Nó làm gì?** Request mua cùng ticket type phải lần lượt vào critical section. Request sau tính remaining sau commit của request trước.

**Vì sao `ORDER BY id`?** Nếu order A mua X,Y và order B mua Y,X, lấy lock khác thứ tự có thể deadlock. Cùng sorting order giảm khả năng vòng chờ.

**Nếu chỉ check availability trước transaction?** Hai request có thể cùng thấy “còn 1” và cùng create order, oversell.

## 10. Idempotency order

**File:** `OrdersService.create()`; schema `Order @@unique([buyerId, clientRequestId])`

```ts
if (dto.clientRequestId) {
  const existing = await tx.order.findUnique({
    where: { buyerId_clientRequestId: { buyerId, clientRequestId: dto.clientRequestId } },
  });
  if (existing) return { id: existing.id, issued: false };
}
```

**Nó làm gì?** Khi client retry cùng action sau timeout/lỗi mạng, trả order cũ thay vì tạo order mới.

**Vì sao idempotency key theo buyer?** Cùng random client id của hai buyer không nên collide; unique composite đúng domain scope.

**Nếu chỉ dùng frontend disable button?** Network retry/app crash vẫn có request duplicate. Cần server/database invariant.

## 11. Payment callback: status flip có điều kiện

**File:** `PaymentsService.handleSepayWebhook()`

```ts
const flipped = await tx.$executeRaw`
  UPDATE "Order" SET status = 'PAID', "paidAt" = now()
  WHERE id = ${order.id}::uuid
    AND status = 'PENDING'
    AND "expiresAt" > now()`;

if (flipped === 0) return false;
```

**Nó làm gì?** Chỉ paid order đúng một lần khi order vẫn pending và chưa hết hạn.

**Vì sao quan trọng?** Cron expiry/user cancel/webhook đều có thể chạy cùng lúc. Câu SQL biến state check + state change thành atomic operation.

**Sau flip có gì?** Tạo tất cả `Ticket`, `Payment MATCHED`, notification trong transaction. Chỉ sau commit mới queue email.

## 12. Webhook API key constant-time

**File:** `backend/src/modules/payments/payments.controller.ts` – `assertApiKey()`

```ts
const valid =
  expected.length > 0 &&
  expectedBuf.length === providedBuf.length &&
  timingSafeEqual(expectedBuf, providedBuf);
```

**Nó làm gì?** Xác thực callback SePay bằng header `Authorization: Apikey <key>`; config trống không được coi valid.

**Tại sao check length trước?** `timingSafeEqual` ném exception với buffer khác length. So sánh constant-time có ý nghĩa sau khi hai buffer có cùng độ dài.

## 13. HMAC QR và constant-time verify

**File:** `TicketSignerService.verify()`

```ts
const expected = Buffer.from(this.sign(code));
const actual = Buffer.from(signature);
return expected.length === actual.length && timingSafeEqual(expected, actual);
```

**Nó làm gì?** Verify signature của `code.signature`, không cần lấy secret xuống scanner app.

**Tại sao still query Ticket afterward?** HMAC chỉ nói code do server tạo; ticket có thể đã USED, thuộc event khác, hoặc record không tồn tại. Database quyết định trạng thái nghiệp vụ.

## 14. Check-in exactly once

**File:** `CheckinService.resolve()`

```ts
const updated = await this.prisma.$executeRaw`
  UPDATE "Ticket"
  SET status='USED', "usedAt"=now(), "usedByStaffId"=${staffId}::uuid
  WHERE id=${ticket.id}::uuid AND status='ISSUED'`;

if (updated === 1) return { result: 'VALID', ... };
```

**Nó làm gì?** Consume ticket là compare-and-set atomic. Có đúng một scanner update successful.

**Tại sao query lại khi 0 row?** Pre-read có thể stale vì scanner khác vừa consume; re-read phân biệt `ALREADY_USED` với dữ liệu invalid.

**Tại sao log cả INVALID/WRONG_EVENT?** Audit/check operational issue cần cả quét thất bại, không chỉ vé hợp lệ.

## 15. Notification có structured data, không lưu text cứng

**File:** `NotificationsService`; `NotificationCenterScreen.notificationCopy()`

```ts
await tx.notification.create({
  data: {
    userId,
    type: 'EVENT_APPROVED',
    data: { eventId, eventTitle, url },
  },
});
```

UI:

```ts
t(`notifications.types.${item.type}.title`, { ...item.data })
```

**Nó làm gì?** Database lưu fact/type, client render câu theo ngôn ngữ hiện tại.

**Tại sao tốt hơn lưu “Sự kiện đã được duyệt”?** User đổi VI/EN vẫn thấy language mới; backend không phải biết mọi sentence UI. `data` vẫn mang title/link động.

## 16. Hide event và pending order cleanup

**File:** `AdminService.hideEvent()`

```ts
await tx.event.updateMany({
  where: { id: eventId, status: EventStatus.PUBLISHED },
  data: { status: EventStatus.HIDDEN, featured: false, hiddenReason: dto.reason },
});
await tx.order.updateMany({
  where: { eventId, status: OrderStatus.PENDING },
  data: { status: OrderStatus.CANCELLED },
});
```

**Nó làm gì?** Cùng transaction ẩn event, bỏ feature và release all holds.

**Nếu không cancel pending?** Inventory bị giữ tới expiry dù event không còn public. Nếu người dùng transfer sau đó, flow payment có thể trở nên khó reconcile hơn.

**Vì sao không cancel PAID?** Paid ticket/refund là nghiệp vụ khác chưa được tự động hóa; không được lặng lẽ xóa quyền đã mua.

## 17. Upload direct Cloudinary an toàn hơn upload unsigned đơn giản

**File:** `UploadsService.createSignature`, `verifyUploadedResource`; app `lib/api/uploads.ts`.

```ts
const signature = cloudinary.utils.api_sign_request(
  { timestamp, public_id, upload_preset, overwrite, invalidate, allowed_formats },
  credentials.apiSecret,
);
```

**Nó làm gì?** Server ký parameters, app dùng signature upload trực tiếp Cloudinary. Sau upload, app gửi `assetId/version`; server đọc Cloudinary resource và verify trước persist URL.

**Tại sao không nhận `secureUrl` client gửi rồi save?** Client có thể gửi URL giả/asset không thuộc public id. Verify asset id/version/public id ràng buộc upload với authorization server đã cấp.

## 18. Statistics timezone/CSV logic

**File:** `StatisticsService.parseRevenueReportRange`, `getDailyStatistics`, `escapeCsvValue`.

```ts
const endExclusive = new Date(end.getTime() + DAY_MS);
paidAt: { gte: range.start, lt: range.endExclusive }
```

**Nó làm gì?** Range inclusive theo ngày user chọn nhưng query half-open interval `[start, nextDayStart)`, không mất record lúc chiều tối của ngày `to`.

```ts
const spreadsheetSafe = typeof value === 'string' &&
  /^[=+\-@\t\r\n\uFF1D\uFF0B\uFF0D\uFF20]/u.test(text)
  ? `'${text}` : text;
```

**Nó làm gì?** Cản formula injection khi event title/ticket type mở bằng ký tự formula trong Excel/Sheets.

## 19. Rút tiền: serialized balance check

**File:** `WithdrawalsService.create()`

```ts
await tx.$queryRaw`
  SELECT id FROM "User" WHERE id=${organizerId}::uuid FOR UPDATE
`;
const open = await tx.withdrawalRequest.count({
  where: { organizerId, status: { in: [PENDING, APPROVED] } },
});
const balance = await this.readBalance(tx, organizerId);
```

**Nó làm gì?** Lock owner trước khi count open/balance/create request.

**Tại sao không chỉ aggregate rồi create?** Hai POST song song đều có thể thấy available 1,000,000 và mỗi request 800,000, dẫn đến reserved 1,600,000. Lock serialize read-check-write sequence.

## 20. `apiFetch` và normalized frontend error

**File:** `app/src/lib/api/client.ts`

```ts
const token = await tokenStorage.get();
const headers = new Headers(options.headers);
headers.set('Content-Type', 'application/json');
if (token) headers.set('Authorization', `Bearer ${token}`);

const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
if (!res.ok) throw await toApiError(res);
```

**Nó làm gì?** Một nơi xử lý base URL, auth, JSON và standard errors.

**Nếu mỗi màn dùng fetch?** Dễ quên token/204/error JSON; message trở nên không thống nhất và đổi API base khó.

## 21. TanStack Query keys và invalidation

**File:** `app/src/lib/api/orders.ts`, `app/src/app/(attendee)/tickets.tsx`.

```ts
export const ordersKeys = {
  all: ['orders'] as const,
  pending: () => [...ordersKeys.all, 'pending'] as const,
  detail: (id) => [...ordersKeys.all, 'detail', id] as const,
};
```

**Nó làm gì?** Key có hierarchy nhất quán. Sau mutation, screen invalidate chính xác sub-tree thay vì không biết cache nào stale.

**Ví dụ:** cancel order optimistic lọc item khỏi pending cache, update detail cache, rồi invalidate pending để reconcile server. UI phản hồi nhanh nhưng server vẫn là final truth.

## 22. Camera callback lock bằng ref

**File:** `app/src/app/scanner/scan/[eventId].tsx`

```ts
const lock = useRef(false);
async function submit(qr: string) {
  if (!payload || lock.current) return;
  lock.current = true;
  setPending(true);
  ...
}
```

**Nó làm gì?** Bỏ các barcode callback tiếp theo ngay trong cùng tick JS.

**Tại sao không dùng `pending` state?** `setPending(true)` schedule rerender, không thay đổi closure ngay lập tức. Camera có thể invoke several callbacks trước rerender.

## 23. Theme token không hardcode màu component

**File:** `app/src/design/tokens.ts`, `themes.ts`, root `_layout.tsx`.

**Logic:** palette semantic `surface`, `primary`, `error` -> `vars()` root -> NativeWind class `bg-surface`, `text-primary` trong component.

**Lợi ích:** đổi light/dark palette ở central source; component giữ semantic meaning. Hardcode `#...` trong hàng trăm component sẽ khó audit/accessibility/theme.

## 24. Những câu trả lời nên tránh

- Không nói “Google login đã làm” – schema có `googleSubject` nhưng UI/API OAuth không có.
- Không nói “có push notification” – có persisted in-app notification/tab badge, chưa có device push delivery.
- Không nói “sales window đã chặn mua” – hiện chỉ validate input window, order flow chưa enforce.
- Không nói “admin tự chuyển tiền” – admin ghi nhận manual transfer trong withdrawal.
- Không nói “email guaranteed” – email best effort sau commit.
