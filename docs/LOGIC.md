# Phân tích logic và business rules quan trọng

Tài liệu này ưu tiên các function/class có khả năng bị mở trực tiếp khi vấn đáp. Mỗi phần trả lời ba câu: **dữ liệu vào là gì, xử lý/bảo vệ gì, kết quả ra sao**.

## 1. Bản đồ logic cần nhớ

| Chủ đề | File / symbol nên mở | Ý chính |
| --- | --- | --- |
| Startup/API cross-cutting | `backend/src/main.ts` | prefix, CORS, validation, Swagger, exception filter |
| Auth/session | `modules/auth/auth.service.ts` – `buildSession`, `login`, `changePassword` | JWT + DB session revoke |
| Permissions | `jwt.strategy.ts`, `guards/roles.guard.ts`, `guards/event-staff.guard.ts` | auth, RBAC, ownership scanner |
| Event lifecycle | `events-organizer.service.ts` – `ALLOWED_TRANSITIONS`, `publish` | draft/review/public + admin-only approval |
| Inventory/order | `orders.service.ts` – `create` | lock ticket types, reserved PENDING/PAID, 3 pending max |
| Payment | `payments.service.ts` – `handleSepayWebhook` | match + idempotency + guarded paid flip |
| Ticket QR | `ticket-signer.service.ts`, `tickets.service.ts` | random code + HMAC |
| Check-in | `checkin.service.ts` – `resolve` | verify HMAC, right event, atomic consume |
| Admin moderation | `admin.service.ts` | approve/feature/hide/unhide |
| Notification | `notifications.service.ts` | persisted/unread/read |
| Upload | `uploads.service.ts` | signed direct Cloudinary, verify then persist |
| Statistics | `statistics.service.ts` | paid-only aggregate, Vietnam dates, safe CSV |
| Withdrawal | `withdrawals.service.ts` | settled balance, one open request, state transition |
| Frontend data | `lib/api/client.ts`, `lib/query/query-client.ts` | fetch/error normalization/cache |
| Frontend auth | `stores/auth-store.ts`, `token-storage.ts` | storage/hydration/logout cache clear |
| Frontend realtime | `lib/socket/socket.ts`, organizer event detail | socket room + cache patch/refetch |

## 2. Request pipeline và validation

### File: `backend/src/main.ts`

Request đi qua global `ValidationPipe` trước controller. Cấu hình quan trọng:

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: ...,
})
```

- `whitelist`: bỏ field lạ không có decorator DTO.
- `forbidNonWhitelisted`: thay vì im lặng bỏ, trả 400. Tốt cho API contract và chống mass assignment.
- `transform`: ví dụ `page="2"` trở thành number nhờ `@Type(() => Number)`.
- `exceptionFactory`: các endpoint trả cùng shape stable code để app map i18n.

**Nếu bỏ validation pipe:** từng controller phải tự kiểm tra data; dễ quên, không thống nhất, và client có thể gửi field/kiểu sai sâu vào nghiệp vụ.

## 3. Authentication: `AuthService`

### 3.1 Register – `register(dto)`

Input: `fullName, email, password, role?, locale?`.

Logic:

1. Normalize email (`trim().toLowerCase()`).
2. Chỉ xác định `PENDING` khi role là organizer, attendee mặc định active.
3. `bcrypt.hash(password, 10)`.
4. `prisma.user.create`.
5. Bắt Prisma error `P2002` để trả `EMAIL_ALREADY_REGISTERED`.
6. Gọi `buildSession` để trả token/user.

**Tại sao organizer pending mà vẫn có token?** User có thể vào app xem trạng thái/hồ sơ; nhưng `RolesGuard` từ chối các action organizer cho đến khi admin approve. Đây là tách authentication khỏi authorization.

### 3.2 Login – `login(dto)` và `DUMMY_HASH`

```ts
const hash = user?.passwordHash ?? DUMMY_HASH;
const passwordOk = await bcrypt.compare(dto.password, hash);
if (!user || !user.passwordHash || !passwordOk) throw invalidCredentials;
```

Không tồn tại email vẫn chạy bcrypt compare với dummy hash. Điều này giảm email enumeration qua thời gian phản hồi. Sau đó mới check `BLOCKED`.

### 3.3 Build session – `buildSession(user, expiresInOverride?)`

`randomUUID()` tạo `sid`, JWT được ký chứa `sub` user id và `sid`, `jwt.decode` lấy `exp`, rồi insert `AuthSession`.

Điểm logic: JWT ký xong mới biết exact expiration để lưu `expiresAt` DB khớp token. Không hardcode lại một ngày ở hai chỗ vì dễ lệch config.

### 3.4 `JwtStrategy.validate(payload)`

JWT signature/expiry do Passport verify. Strategy còn query:

```ts
where: {
  id: payload.sid,
  userId: payload.sub,
  revokedAt: null,
  expiresAt: { gt: new Date() },
}
```

Sau đó reject user `BLOCKED` và return `CurrentUserData`. Vì vậy endpoint nhận user đã được “refresh” từ DB, không dùng role/status stale trong JWT.

### 3.5 `RolesGuard` và `EventStaffGuard`

`RolesGuard` đọc metadata từ `@Roles`, kiểm tra:

1. user tồn tại;
2. role thuộc danh sách cho phép;
3. status không `PENDING`;
4. status `ACTIVE`.

`EventStaffGuard` thêm điều kiện quan hệ `EventStaff(eventId, userId)` cho scanner. Admin bypass để có quyền giám sát mọi event.

## 4. Event lifecycle và edit safety

### File: `events-organizer.service.ts`

`ALLOWED_TRANSITIONS` là source of truth cho chuyển trạng thái organizer kiểm soát. `assertTransition(from, to)` không cho client gán status tùy ý.

### 4.1 `create`/`update`

- `assertEventDates(startAt, endAt)` bắt buộc start < end.
- Update gọi `loadOwnedEvent` trước, rồi `assertEventEditable(event.status)` yêu cầu draft.
- Update thật dùng:

```ts
event.updateMany({ where: { id, organizerId, status: DRAFT }, data })
```

Tại sao không dùng `update({ where: { id } })`? Giữa lúc đọc và ghi, event có thể được submit/duyệt. `updateMany` condition là CAS; `count=0` nghĩa state đã thay đổi, không được vô tình sửa public event.

### 4.2 `publish` nghĩa là submit review

`publish(organizerId,id)` chạy interactive transaction:

1. `SELECT ... FOR UPDATE` event row.
2. Đọc lại `title`, `status` sau lock.
3. Kiểm tra transition draft -> pending review.
4. Đếm ticket type, phải có ít nhất một.
5. CAS event draft -> `PENDING_REVIEW`.
6. Tạo notifications cho active admins trong cùng transaction.

Khóa event serialize submit với edit ticket type, vì ticket type mutation cũng gọi `lockEditableEvent`.

### 4.3 Ticket type

`updateTicketType`:

1. Khóa event editable.
2. Khóa ticket type bằng `FOR UPDATE`.
3. Validate sales start < sales end nếu cả hai có.
4. Nếu giảm `quantityTotal`, aggregate reservation của PENDING/PAID order.
5. `assertTicketQuantityNotBelowReserved` chặn giảm sức chứa thấp hơn vé đã giữ/bán.

**Điểm cần trả lời thật:** code có lưu `salesStartAt/salesEndAt` và validate thứ tự, nhưng `OrdersService.create` chưa dùng hai field này để chặn mua ngoài khung bán. Đây là enhancement rõ ràng: thêm điều kiện vào `event/ticket type` purchase validation, viết test boundary time.

## 5. Order creation: thuật toán inventory

### File: `OrdersService.create`

### 5.1 Merge duplicate lines

DTO có thể chứa cùng `ticketTypeId` nhiều lần. Code dùng `Map<string, number>` cộng quantity trước.

Lý do:

- schema `OrderItem @@unique([orderId, ticketTypeId])` yêu cầu một dòng mỗi hạng vé;
- availability check rõ ràng;
- client bug/retry không làm tạo duplicate order item.

### 5.2 Lock order

Hai loại lock:

```text
lock buyer User row       -> serialize pending order count per buyer
lock TicketType rows      -> serialize stock reservation per ticket type
```

Ticket types được sort id trước `FOR UPDATE`, tránh vòng chờ A giữ X chờ Y và B giữ Y chờ X (deadlock).

### 5.3 Công thức availability

```text
reserved(ticketType) = SUM(OrderItem.quantity)
                      WHERE Order.status IN (PENDING, PAID)

available = TicketType.quantityTotal - reserved
```

Request bị reject `SOLD_OUT` khi `wanted > available`.

Tại sao PENDING phải count? Nếu chỉ count PAID, 100 người có thể tạo 100 đơn chưa trả tiền cho cùng ghế, và số lượng pending tổng vượt capacity. Khi PENDING hết hạn/hủy, nó không còn count nên ghế được release.

### 5.4 Price integrity

Client không gửi `priceVnd`. Backend đọc map `{ ticketTypeId -> priceVnd }` từ database và tính BigInt. `OrderItem.unitPriceVnd` là snapshot cho history/report.

### 5.5 Paid/free split

```text
total = 0: Order PAID ngay, issue tickets ngay
total > 0: Order PENDING, no ticket until payment webhook
```

Code không có “free endpoint” riêng vì đây là cùng business flow với một khác biệt có chủ đích ở transaction.

### 5.6 Limit pending và idempotency

- At most 3 unexpired paid pending orders per buyer.
- Check nằm sau lock buyer, tránh hai create cùng nhìn count=2 và thành 4.
- `clientRequestId` unique `[buyerId, clientRequestId]`; nếu retry, return existing order và `issued=false` để không email/cấp vé lại.

## 6. Payment webhook: logic fail-safe

### File: `PaymentsService.handleSepayWebhook`

### 6.1 Idempotency first

`Payment.sepayTxnId` unique là defense cuối. Service tìm existing trước để fast no-op; `recordPayment` cũng catch `P2002` nếu hai worker/webhook đua nhau.

### 6.2 Matching

Server tìm order từ `body.code`/transfer code, so sánh `order.totalVnd === BigInt(body.transferAmount)`. Không match thì lưu `UNMATCHED`, không issue ticket.

### 6.3 Conditional payment transition

```sql
UPDATE "Order" SET status='PAID', "paidAt"=now()
WHERE id = :id
  AND status='PENDING'
  AND "expiresAt" > now()
```

Chỉ khi affected rows = 1 mới đọc items và `TicketsService.issue`. Đây là core guard chống:

- callback duplicated;
- callback sau expiry;
- callback race cron;
- callback race user cancel.

### 6.4 Mismatch/late money

Order paid/cancelled/expired hoặc tiền đến muộn => `REVIEW_REQUIRED`, create admin notifications. Hệ thống có bằng chứng `rawPayload`, amount, transfer content cho reconciliation nhưng **không tự cấp vé**.

Đây là fail-safe: thà cần admin xử lý tiền lệch còn hơn cấp vé sai.

## 7. Ticket QR logic

### File: `TicketSignerService`, `TicketsService.issue`

```ts
newCode(): `TK_${randomBytes(16).toString('base64url')}`
signature = HMAC-SHA256(secret, code)
payload = `${code}.${signature}`
```

`issue` chạy trong transaction do caller truyền `tx` vào. Nó loop từ `sequence=1` đến `quantity`, tạo ticket row có unique code + unique `[orderItemId, sequence]`.

Nếu `TicketsService` tự mở transaction riêng, order commit thành công nhưng ticket transaction có thể fail riêng. Nhận transaction client từ caller giữ atomicity.

## 8. Check-in: thuật toán “consume exactly once”

### File: `CheckinService.resolve`

Pseudo-code gần với source:

```text
split qr at first dot -> code, signature
if missing or HMAC invalid: INVALID
ticket = find by code
if not ticket: INVALID
if ticket.eventId != requested eventId: WRONG_EVENT
updated = UPDATE Ticket SET USED ... WHERE id=? AND status=ISSUED
if updated=1: VALID
else re-read status; USED => ALREADY_USED, otherwise INVALID
```

Điểm quan trọng nhất là không làm:

```text
if ticket.status == ISSUED then update status = USED
```

Tách read rồi write có race. Hai scanner cùng đọc `ISSUED` trước khi một scanner write. `UPDATE ... WHERE status=ISSUED` gộp check-and-change thành một atomic database statement, nên chỉ một process thấy `updated=1`.

Mọi outcome ghi `CheckinLog`, gồm raw payload, staff, event, ticket nullable, result. Đây là audit trail: có thể truy trace quét sai/đã dùng, không chỉ log VALID.

## 9. Admin moderation logic

### File: `AdminService`

| Function | Rule cốt lõi | Side effect |
| --- | --- | --- |
| `updateOrganizerStatus` | chỉ user role organizer | status change + logger |
| `approveEvent` | chỉ `PENDING_REVIEW` | PUBLISHED + organizer notification |
| `updateEventFeatured` | `featured=true` chỉ khi PUBLISHED | featured + EVENT_FEATURED nếu bật |
| `hideEvent` | chỉ PUBLISHED, reason bắt buộc | HIDDEN, clear featured, cancel PENDING orders, notify organizer |
| `unhideEvent` | chỉ HIDDEN | PUBLISHED, clear reason, notify organizer |

Các `updateMany` kết hợp status/featured old value implement compare-and-set. Nếu UI stale, service trả conflict hoặc current row thay vì overwrite hành động mới hơn.

## 10. Notifications

### File: `NotificationsService`

Data model:

```text
Notification(userId, type, data JSON?, dedupeKey?, read, createdAt)
```

`data` không fixed schema vì mỗi type cần field khác: event title, ticket count, withdrawal reason… UI chỉ map `type` -> translation template rồi pass data. `dedupeKey` unique dùng cho case có thể retry như `ticket-issued:${orderId}` hoặc `payment-review:${txn}:${adminId}`.

`markRead` dùng `updateMany({ id, userId })`, không `update({id})`: điều kiện userId bảo đảm không đọc notification của người khác.

### Polling phía client

`app/src/lib/api/notifications.ts` khai báo `NOTIFICATIONS_POLL_INTERVAL_MS = 3_000`. Các layout Attendee, Organizer và Admin dùng chu kỳ này cho query unread count; `NotificationCenterScreen` dùng nó cho query danh sách.

`refetchIntervalInBackground: false` chỉ có tác dụng đúng trên native khi TanStack Query biết app có đang focused hay không. Vì vậy root `app/src/app/_layout.tsx` đồng bộ `AppState.currentState === 'active'` vào `focusManager`. Khi app ra nền, interval dừng; khi active lại, query tiếp tục. Scanner không có notification tab nên không có hai query polling này.

Đây là polling gần thời gian thực: server không chủ động đẩy notification xuống thiết bị, client chủ động hỏi lại sau mỗi 3 giây.

## 11. Cloudinary upload logic

### File: `UploadsService`

Các safety check:

1. `getCredentials` fail closed bằng `MEDIA_UPLOAD_UNAVAILABLE` nếu env thiếu.
2. `resolvePublicId`: avatar dùng user id; event cover bắt organizer, event tồn tại/thuộc owner/draft.
3. `createSignature`: server ký timestamp/public id/preset/format, API secret không về client.
4. `verifyUploadedResource`: Cloudinary API resource phải khớp `asset_id`, `version`, allowed format và <=5MB.
5. `completeUpload`: cover lưu URL với condition event vẫn owner + draft.
6. `deleteUpload`: cover clear DB bằng same condition trước rồi best-effort destroy remote asset.

Tại sao app cũng validate 5MB/MIME trong `uploads.ts`? UX nhanh. Nhưng server verify lại vì client validation có thể bị bypass.

## 12. Statistics và CSV

### File: `StatisticsService`

### 12.1 Dashboard

`getStatistics(organizerId?)` dùng cùng function cho admin (no filter) và organizer (filter `event.organizerId`). Chỉ aggregate `OrderStatus.PAID`:

- `paidRevenueVnd`: sum order total.
- `ticketsSold`: sum order item quantity.
- `paidOrders`: count order.
- `publishedEvents`: count PUBLISHED event.
- daily: raw SQL group theo `Asia/Ho_Chi_Minh` trong 30 ngày, fill zero days.
- top 5: group by eventId theo revenue trong range.

Vì sao daily dùng raw SQL? `AT TIME ZONE 'Asia/Ho_Chi_Minh'` và grouping date theo timezone cần biểu thức SQL rõ ràng; Prisma aggregate thường không tiện cho group theo transformed time.

### 12.2 CSV

`parseRevenueReportRange` chỉ chấp nhận strict `YYYY-MM-DD`, tái tạo date theo UTC+7, check calendar thật và max 366 days. `endExclusive` tránh lỗi “to date có time 00:00 nên mất cả ngày cuối”. Query dùng `paidAt >= start AND paidAt < endExclusive`.

`buildCsv` thêm `\uFEFF`, `\r\n`, quote CSV và `escapeCsvValue`. Defense formula injection prefix `'` cho initial formula chars, including CR/LF and full-width variants.

## 13. Withdrawal logic

### File: `WithdrawalsService`

### 13.1 Balance formula

```text
settledRevenue = SUM(PAID order total)
                 where organizer owns event AND event.endAt < now
pending         = SUM(withdrawal amount) status PENDING or APPROVED
withdrawn       = SUM(withdrawal amount) status PAID
available       = max(0, settledRevenue - pending - withdrawn)
```

Chỉ revenue event đã kết thúc được rút để tránh trả tiền trước khi event diễn ra/có rủi ro cancel/refund.

### 13.2 Create request

Service locks organizer User row, rồi check open request count, min amount config, available balance. Lock người organizer serialize hai request tạo đồng thời, không cho cả hai cùng vượt balance. Bank fields được snapshot vào withdrawal request để lịch sử đúng dù user đổi tài khoản ngân hàng sau này.

### 13.3 Review

`review` đọc current status, validate allowed transition, `updateMany(where: {id,status:existing.status})`, tạo notification. Status transition không bị overwrite nếu hai admin xử lý đồng thời.

## 14. Frontend logic cần biết

### 14.1 `apiFetch`

`app/src/lib/api/client.ts` là single point cho REST JSON. Nếu không tập trung phần này, mỗi wrapper phải lặp token, headers, parse errors, dẫn đến inconsistency.

`apiFetchBytes` không gắn `Content-Type: application/json` vì export CSV nhận binary, nhưng vẫn gắn Authorization.

Khi `config.apiUrl` chứa `.ngrok-free.app`, cả `apiFetch` và `apiFetchBytes` gắn `ngrok-skip-browser-warning: true`. Header này chỉ bỏ trang HTML cảnh báo của ngrok trong môi trường phát triển; JWT và backend authorization vẫn là lớp bảo mật thật.

### 14.2 `auth-store`

- `hydrate`: Promise.all token/user, sau đó set `isLoading=false` trong `finally`.
- `signIn`: clear query cache trước, persist token/user, set memory state.
- `signOut`: thử server logout, luôn clear local data/cache dù network failed.

### 14.3 `TicketsScreen`

- Poll pending orders mỗi 4s chỉ khi có pending order.
- Interval mỗi 1s cho clock/countdown UI, không request mỗi giây.
- Search normalize Vietnamese diacritics để “ve” có thể match “vé”.
- `ViewShot.capture()` tạo uri screenshot, `MediaLibrary.saveToLibraryAsync()` lưu ảnh.

### 14.4 Camera locks

Cả `auth/staff-connect.tsx` và `scanner/scan/[eventId].tsx` dùng `useRef(false)` lock. Camera barcode callback có thể burst; state update async nên `pending` state không đủ chống POST duplicate trước rerender.

### 14.5 Query invalidation

Sau mutation, source thường invalidate key domain thay vì reload cả app:

- Hủy pending order: `ordersKeys.pending`, `ordersKeys.detail(id)`, tickets nếu pending ids đổi.
- Admin approve/feature/hide: invalidates admin event list/detail và discovery when needed.
- Notification read: invalidates `notificationsKeys.all`.

Đây là cache coherence có scope nhỏ, giảm network/UI flicker.

## 15. Điểm có thể bị hỏi “tại sao chưa làm khác?”

| Điểm hiện tại | Câu trả lời phù hợp | Hướng nâng cấp |
| --- | --- | --- |
| Email best effort | Không để SMTP failure rollback bán vé | outbox worker/retry/dead-letter |
| In-app notification, chưa push | DB đảm bảo xem lại/unread sau login | Expo push token + delivery worker |
| Payment review manual | Hệ thống không nên tự xử lý tiền không match | reconciliation workflow/refund integration |
| Rút tiền thủ công | Chưa tích hợp bank payout provider | KYC + payout gateway + ledger |
| BigInt -> number DTO | VND phạm vi demo an toàn, domain calculation vẫn BigInt | serialize money as string/decimal for large scale |
| Socket check only JWT/user | đủ để demo live dashboard | validate AuthSession + role/status full parity HTTP |
| Event sales windows not enforced purchase | field lifecycle có sẵn nhưng chưa close rule | require now inside sales window in `OrdersService.create` |
| Chưa có Outbox model/worker | Email có thể thất bại sau khi business transaction đã commit | thêm outbox table + publisher/consumer có retry |
