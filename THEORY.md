# Lý thuyết gắn với dự án eTicket

> Mục tiêu của tài liệu này là giúp giải thích **đúng những gì dự án đang làm**. Khi thi, hãy bắt đầu từ bài toán, sau đó nêu khái niệm, rồi chỉ ra file hiện thực.

## 1. Bài toán và các vai trò

eTicket là hệ thống bán và quản lý vé sự kiện đa vai trò.

| Vai trò | Nghiệp vụ chính | Hiện thực chính |
| --- | --- | --- |
| `ATTENDEE` | Khám phá sự kiện, đặt vé, thanh toán VietQR, xem/lưu vé QR | `app/src/app/(attendee)`, `backend/src/modules/orders` |
| `ORGANIZER` | Tạo sự kiện nháp, tạo hạng vé, gửi duyệt, quản lý scanner, xem doanh thu/rút tiền | `app/src/app/organizer`, `events-organizer`, `staff`, `withdrawals`, `statistics` |
| `SCANNER` | Kết nối bằng mã một lần và quét QR tại cổng | `app/src/app/scanner`, `checkin`, `staff` |
| `ADMIN` | Duyệt organizer/sự kiện, ẩn sự kiện, chọn nổi bật, xử lý tiền lệch và yêu cầu rút tiền | `app/src/app/admin`, `admin`, `payment-reviews`, `withdrawals` |

Vai trò là dữ liệu enum `Role` trong `backend/prisma/schema.prisma`. Đây là **RBAC** (Role-Based Access Control): quyền được quyết định theo vai trò, không phải theo việc ẩn/hiện nút ở giao diện.

## 2. Kiến trúc client-server và REST API

### 2.1 Client-server là gì?

- **Client** là ứng dụng Expo/React Native trong thư mục `app/`. Nó nhận thao tác người dùng, hiển thị giao diện và gọi API.
- **Server** là ứng dụng NestJS trong `backend/`. Nó kiểm tra quyền, kiểm tra dữ liệu, thực hiện nghiệp vụ và đọc/ghi PostgreSQL.
- Client **không được tự quyết định dữ liệu nhạy cảm** như giá tiền, quyền admin hay trạng thái vé. Ví dụ, app gửi `ticketTypeId` và `quantity`; `OrdersService.create()` tự đọc lại giá `priceVnd` trong database.

### 2.2 REST và HTTP

REST là cách tổ chức API quanh tài nguyên. Trong dự án:

| Tài nguyên | Ví dụ endpoint | Ý nghĩa HTTP |
| --- | --- | --- |
| Xác thực | `POST /api/auth/login` | Tạo phiên đăng nhập |
| Sự kiện công khai | `GET /api/events` | Đọc danh sách |
| Đơn hàng | `POST /api/orders` | Tạo đơn |
| Vé của tôi | `GET /api/me/tickets` | Đọc tài nguyên thuộc người gọi |
| Duyệt sự kiện | `POST /api/admin/events/:id/approve` | Hành động nghiệp vụ, không phải CRUD thuần |

`backend/src/main.ts` đặt prefix toàn cục là `api`; vì vậy controller viết `@Controller('orders')` thành đường dẫn thật `/api/orders`. App ghép prefix trong `app/src/lib/api/client.ts`.

Các mã HTTP cần nhớ:

- `200 OK`: đọc/thao tác thành công.
- `201 Created`: tạo tài nguyên thành công.
- `204 No Content`: thành công nhưng không trả body, ví dụ logout/hủy đơn.
- `400 Bad Request`: dữ liệu không hợp lệ.
- `401 Unauthorized`: chưa đăng nhập, token/phiên không hợp lệ.
- `403 Forbidden`: đã đăng nhập nhưng sai role hoặc organizer chưa được duyệt.
- `404 Not Found`: không thấy tài nguyên, trong nhiều chỗ cũng giúp không lộ tài nguyên của người khác.
- `409 Conflict`: xung đột nghiệp vụ/trạng thái, ví dụ bán hết vé hoặc đơn đã hết hạn.

## 3. NestJS: module, controller, service và Dependency Injection

### 3.1 Module

NestJS chia backend thành các `Module`. `backend/src/app.module.ts` là composition root, import các module như `AuthModule`, `EventsModule`, `OrdersModule`, `PaymentsModule`.

Một module gom controller và service cùng nghiệp vụ. Ví dụ `backend/src/modules/orders/orders.module.ts` import `TicketsModule`, `NotificationsModule`, `MailModule` vì tạo đơn cần cấp vé, thông báo và gửi email.

Lợi ích: code có ranh giới rõ, dễ kiểm thử và không dồn tất cả vào một file.

### 3.2 Controller

Controller nhận HTTP request, lấy `@Body`, `@Param`, `@Query`, `@CurrentUser`, sau đó gọi service. Nó không nên chứa thuật toán lớn.

Ví dụ `OrdersController.create()` chỉ lấy user hiện tại và `CreateOrderDto`, rồi gọi `OrdersService.create(user.id, dto)`. Nhờ đó logic tạo đơn có thể test mà không phụ thuộc HTTP.

### 3.3 Service

Service giữ business logic và giao tiếp database. Các ví dụ quan trọng:

- `AuthService`: đăng ký, login, đổi mật khẩu, session.
- `OrdersService`: giữ chỗ, chống oversell, tạo đơn/cấp vé.
- `PaymentsService`: xử lý webhook SePay.
- `CheckinService`: xác thực QR và tiêu thụ vé.
- `AdminService`: duyệt/ẩn/nổi bật sự kiện.

### 3.4 Dependency Injection (DI)

DI là việc NestJS tạo và truyền dependency vào constructor thay vì lớp tự `new` dependency.

Ví dụ `OrdersService` nhận `PrismaService`, `TicketsService`, `NotificationsService`, `TicketEmailService`, `ConfigService` qua constructor. Lợi ích:

1. Tách phụ thuộc rõ ràng.
2. Dễ thay thế mock trong test.
3. Dùng một cấu hình/kết nối chung thay vì tự tạo nhiều lần.

## 4. DTO, validation và API contract

### 4.1 DTO là gì?

DTO (Data Transfer Object) mô tả dữ liệu được phép đi qua API. Ví dụ `backend/src/modules/orders/dto/create-order.dto.ts` quy định event, các dòng hạng vé và số lượng.

DTO không phải schema database. DTO là “hợp đồng đầu vào/đầu ra”, còn Prisma schema mô tả bảng và quan hệ lưu trữ.

### 4.2 Validation nhiều lớp

Dự án dùng `class-validator` và `class-transformer`:

- `@IsUUID()`, `@IsInt()`, `@Min()`, `@MaxLength()` kiểm tra kiểu/ràng buộc.
- `@Transform()` trim text trước khi dùng.
- `@Type(() => Number)` chuyển query string thành số trước khi validate.
- `@ValidateNested()` kiểm tra từng phần tử của mảng `items` trong đơn hàng.

`ValidationPipe` toàn cục trong `backend/src/main.ts` bật:

- `whitelist: true`: bỏ field không khai báo trong DTO.
- `forbidNonWhitelisted: true`: coi field lạ là lỗi, tránh client gửi nhầm hoặc mass assignment.
- `transform: true`: áp dụng chuyển kiểu.

Lỗi được chuẩn hóa thành `VALIDATION_FAILED` cùng `fields: [{ field, rule }]`. App chuyển stable code này thành ngôn ngữ hiện tại tại `app/src/lib/api/error-message.ts`.

### 4.3 Validation kỹ thuật khác validation nghiệp vụ

- Kỹ thuật: email đúng format, `quantity >= 1`, UUID hợp lệ.
- Nghiệp vụ: sự kiện phải `PUBLISHED` mới mua được, không quá 3 đơn chờ, không rút quá số dư.

Validation kỹ thuật nằm nhiều ở DTO. Validation nghiệp vụ phải ở service/database vì chỉ server mới biết trạng thái hiện tại.

## 5. Cơ sở dữ liệu quan hệ, Prisma và thiết kế schema

### 5.1 PostgreSQL và quan hệ

PostgreSQL là relational database: dữ liệu tách thành bảng có khóa chính/khóa ngoại. Prisma schema ở `backend/prisma/schema.prisma` là nguồn mô tả chính.

Các quan hệ cần thuộc:

```text
User (organizer) 1 --- n Event 1 --- n TicketType
User (buyer)     1 --- n Order 1 --- n OrderItem 1 --- n Ticket
Event            1 --- n Order
Event            n --- n User(SCANNER), qua EventStaff
User             1 --- n Notification
```

`OrderItem` giữ `unitPriceVnd`, thay vì chỉ đọc giá hiện tại từ `TicketType`. Đây là **snapshot giá**: khi organizer đổi giá hạng vé sau này, lịch sử đơn cũ vẫn đúng.

### 5.2 Khóa và ràng buộc

Các ràng buộc trực tiếp giúp database bảo vệ invariant:

- `User.email @unique`: email không đăng ký trùng.
- `Order.transferCode @unique`: mỗi nội dung chuyển khoản chỉ thuộc một đơn.
- `Order @@unique([buyerId, clientRequestId])`: idempotency khi app gửi lại request tạo đơn.
- `Ticket.code @unique`: không có hai vé chung mã.
- `Ticket @@unique([orderItemId, sequence])`: một dòng đơn không tạo lặp vé số thứ tự.
- `EventStaff @@unique([eventId, userId])`: không gán trùng một scanner cho một event.

### 5.3 Vì sao tiền dùng `BigInt`?

`priceVnd`, `totalVnd`, `amountVnd` dùng `BigInt` để biểu diễn VND nguyên chính xác, không dùng số thực có sai số nhị phân kiểu JavaScript `number`.

Trong nội bộ service, ví dụ `OrdersService.create()`, tổng tiền là:

```ts
totalVnd += price * BigInt(quantity)
```

Prisma trả `bigint`; JSON không serialize `bigint` trực tiếp nên DTO chuyển sang `Number(...)`. Đây hợp lý trong phạm vi tiền VND của dự án, nhưng về mặt lý thuyết nếu tổng vượt `Number.MAX_SAFE_INTEGER` thì cần trả string/decimal. CSV hiện giữ `bigint` đến lúc stringify trong `StatisticsService`.

### 5.4 Index

Index làm nhanh truy vấn phổ biến. Ví dụ:

- `Event @@index([status, startAt])` phục vụ danh sách event đã publish/sắp diễn ra.
- `Order @@index([status, expiresAt])` phục vụ cron tìm đơn hết hạn.
- `Notification @@index([userId, read, createdAt])` phục vụ tab thông báo và badge chưa đọc.

Khi thi, nói rõ: index tăng tốc đọc nhưng làm ghi tốn thêm chi phí; vì vậy chỉ đặt theo pattern query thực tế.

## 6. Authentication, authorization và session

### 6.1 Authentication vs authorization

- **Authentication**: “bạn là ai?” Dự án dùng email/password hoặc scanner connect code để cấp JWT.
- **Authorization**: “bạn được làm gì?” Dự án dùng `RolesGuard`, `EventStaffGuard`, điều kiện `organizerId` và status.

Không nên trả lời “có JWT nên an toàn”. JWT chỉ là một phần xác thực; server vẫn phải kiểm tra quyền và ownership trên từng request.

### 6.2 Bcrypt cho password

`AuthService.register()` và `changePassword()` gọi `bcrypt.hash(..., 10)`. Password không được lưu plaintext; database chỉ giữ `passwordHash`.

Khi login, `bcrypt.compare(password, hash)` kiểm tra. `DUMMY_HASH` trong `AuthService.login()` khiến email không tồn tại vẫn tốn một lần compare; điều này giảm chênh lệch thời gian có thể bị dùng để đoán email hợp lệ.

### 6.3 JWT + stateful session

JWT của dự án chứa:

```json
{ "sub": "user-id", "sid": "session-id", "exp": "..." }
```

`AuthService.buildSession()` tạo một hàng `AuthSession` và JWT. Sau khi chữ ký JWT hợp lệ, `JwtStrategy.validate()` còn tìm session chưa revoke/chưa hết hạn và đọc lại user hiện tại.

Đây là thiết kế **hybrid**:

- JWT cho phép client mang access token.
- `AuthSession` cho phép server thu hồi token khi logout/đổi mật khẩu, điều mà JWT hoàn toàn stateless làm khó.

Đổi password revoke mọi session khác session hiện tại; logout chỉ revoke session hiện tại.

### 6.4 RBAC và ownership

- `@Roles('ADMIN')` + `RolesGuard` bảo vệ API admin.
- `@Roles('ORGANIZER')` chặn organizer `PENDING` và `BLOCKED` thao tác.
- `EventsOrganizerService.loadOwnedEvent()` luôn query `{ id, organizerId }`, nên organizer không thể sửa event người khác.
- `EventStaffGuard` yêu cầu scanner phải có hàng `EventStaff` khớp event đang quét. Admin được bypass có chủ đích.

## 7. Mật mã ứng dụng: HMAC và QR ticket

### 7.1 Mã QR không phải là bằng chứng đủ

Nếu QR chỉ chứa ticket id, người dùng có thể tự tạo payload giống định dạng. Dự án dùng payload:

```text
TK_randomCode.base64url(HMAC-SHA256(serverSecret, TK_randomCode))
```

`TicketSignerService` ở `backend/src/modules/tickets/ticket-signer.service.ts` sinh code ngẫu nhiên bằng `randomBytes(16)`, ký HMAC-SHA256 và xác thực bằng `timingSafeEqual`.

HMAC dùng secret chỉ có server. Scanner có thể loại payload bị giả trước khi query database. Nhưng chữ ký hợp lệ **không đồng nghĩa** vé chưa dùng: trạng thái `ISSUED/USED` vẫn phải do database quyết định.

### 7.2 Constant-time comparison

So sánh chuỗi thông thường có thể dừng tại ký tự khác đầu tiên. `timingSafeEqual` giảm nguy cơ timing attack. Code kiểm tra độ dài trước vì hàm này ném lỗi nếu hai Buffer khác độ dài.

Cùng tư duy đó được dùng khi so sánh API key webhook SePay trong `PaymentsController.assertApiKey()`.

## 8. Transaction, ACID, concurrency và idempotency

Đây là nhóm kiến thức quan trọng nhất nếu giảng viên hỏi “hai người mua cùng lúc thì sao?”.

### 8.1 Transaction và ACID

Transaction nhóm nhiều thay đổi thành một đơn vị: tất cả thành công hoặc rollback toàn bộ.

- **Atomicity**: đơn paid + ticket + payment + notification cùng commit trong `PaymentsService`.
- **Consistency**: sau commit, ràng buộc/logic vẫn đúng.
- **Isolation**: giao dịch đồng thời không thấy trạng thái dở dang theo cách gây lỗi.
- **Durability**: khi database commit, dữ liệu tồn tại qua restart.

Ví dụ free order trong `OrdersService.create()` tạo `Order`, `OrderItem`, `Ticket`, `Notification` trong một transaction. Không có trường hợp đơn đã paid nhưng chỉ cấp nửa số vé vì lỗi giữa chừng.

### 8.2 Race condition và row lock

Race condition là hai request cùng đọc một số lượng còn lại rồi cùng ghi, dẫn đến oversell.

`OrdersService.create()` khóa các `TicketType` theo thứ tự id:

```sql
SELECT id FROM "TicketType"
WHERE id = ANY($ids::uuid[])
ORDER BY id FOR UPDATE
```

Sau lock, service tính reserved từ `OrderItem` của đơn `PENDING` và `PAID`. Request thứ hai phải chờ request đầu commit/rollback, sau đó mới tính lại số còn lại.

Khóa theo thứ tự giúp giảm deadlock khi mua nhiều hạng vé: mọi transaction cố lấy khóa theo cùng thứ tự.

### 8.3 Compare-and-set (CAS) bằng guarded update

Không phải nơi nào cũng cần giữ lock. Nhiều chỗ dùng `updateMany` kèm trạng thái cũ:

```ts
where: { id, status: 'PENDING', expiresAt: { gt: now } }
data: { status: 'CANCELLED' }
```

Nếu `count !== 1`, trạng thái đã đổi bởi webhook/cron/request khác. Đây là optimistic concurrency/CAS: “chỉ update nếu vẫn đang ở trạng thái tôi vừa kiểm tra”.

Nó được dùng cho hủy đơn, approve event, hide/unhide event, review payment, review withdrawal, sửa event draft.

### 8.4 Idempotency

Idempotency nghĩa là cùng request lặp lại cho cùng kết quả, không nhân đôi side effect.

Hai nơi quan trọng:

1. `Order.clientRequestId` unique theo buyer: app retry tạo order không tạo thêm đơn/vé.
2. `Payment.sepayTxnId` unique: SePay gửi lại webhook không cấp vé lần hai.

Đây là lý do không dùng “nếu client nói chưa gửi thì tin client”; server/database phải có unique constraint.

## 9. State machine (máy trạng thái) cho nghiệp vụ

State machine mô hình hóa trạng thái và các chuyển trạng thái hợp lệ, tránh “PATCH status tùy ý”.

### 9.1 Event

`EventsOrganizerService.ALLOWED_TRANSITIONS`:

```text
DRAFT -> PENDING_REVIEW -> PUBLISHED -> CANCELLED
  ^          |                |
  |          +----------------+
  +--------------------- HIDDEN -> DRAFT
```

Diễn giải đúng hơn:

- Organizer tạo/sửa/xóa khi `DRAFT`.
- `POST .../publish` thực tế là **gửi duyệt**, chuyển `DRAFT -> PENDING_REVIEW`.
- Admin duyệt `PENDING_REVIEW -> PUBLISHED`.
- Organizer có thể đưa pending/published về draft; cancel chỉ từ published.
- Admin `hide` chuyển `PUBLISHED -> HIDDEN`; organizer chỉ có thể đưa hidden về draft để sửa và gửi lại; admin `unhide` đưa `HIDDEN -> PUBLISHED`.

### 9.2 Order, ticket, withdrawal

| Đối tượng | Trạng thái và ý nghĩa |
| --- | --- |
| Order | `PENDING` giữ chỗ; `PAID` đã thanh toán; `EXPIRED` quá hạn; `CANCELLED` do user/admin hủy |
| Ticket | `ISSUED` dùng được; `USED` đã check-in; `VOID` có enum nhưng chưa có flow nào trong source chuyển sang trạng thái này |
| Withdrawal | `PENDING -> APPROVED -> PAID`; có nhánh `REJECTED`/`CANCELLED` |

`assertTransition()` và `assertWithdrawalTransition()` tập trung luật chuyển trạng thái, làm business rule dễ đọc, dễ test, dễ thêm trạng thái mới.

## 10. Thanh toán webhook và eventual consistency

### 10.1 Tại sao không tin app báo “tôi đã chuyển khoản”?

App hiển thị VietQR, nhưng nguồn xác nhận tiền là callback từ SePay tới endpoint public `POST /api/payments/sepay/webhook`. `PaymentsController` xác thực header `Authorization: Apikey ...`, sau đó `PaymentsService` match nội dung chuyển khoản và số tiền với order.

### 10.2 Paid order flow

1. User tạo đơn giá > 0: order `PENDING`, có `transferCode`, `expiresAt`, QR.
2. `PENDING` cũng là reservation inventory.
3. SePay callback đến.
4. Server chỉ `PENDING -> PAID` nếu `expiresAt > now()` bằng update có điều kiện.
5. Trong cùng transaction server tạo tickets, Payment `MATCHED`, notification `TICKET_ISSUED`.

Nếu tiền đến muộn, amount/code sai hoặc order không còn pending, server **không cấp vé**. Nó lưu `Payment` là `UNMATCHED` hay `REVIEW_REQUIRED`; admin xử lý ngoài hệ thống và ghi chú kết quả.

Đây là cách xử lý eventual consistency: transfer ngân hàng đến bất đồng bộ, có thể chậm/trùng thứ tự; hệ thống phải chịu được.

### 10.3 Cron hết hạn đơn

`OrdersExpiryService.sweepExpired()` chạy mỗi 30 giây bằng `@Cron(CronExpression.EVERY_30_SECONDS)`. Nó chỉ đổi `PENDING` quá hạn sang `EXPIRED`. Vì availability chỉ tính `PENDING` + `PAID`, ghế tự được trả lại mà không cần “cộng tồn kho” riêng.

## 11. Thông báo, email và realtime

### 11.1 Notification in-app

`Notification` là bản ghi database theo user, có `type`, JSON `data`, `read`, `dedupeKey`. `NotificationsService` cung cấp list, unread count, đọc một/tất cả.

Điểm quan trọng: thông báo hiện là **in-app persisted notification**, không phải push notification OS. Người chưa đăng nhập vẫn thấy badge khi đăng nhập lại vì record nằm database.

### 11.2 Notification localization

Server lưu type/data có cấu trúc thay vì câu tiếng Việt/Anh. `NotificationCenterScreen` lấy `type` rồi render bằng i18n key. Nhờ vậy đổi ngôn ngữ không phải tạo lại notification cũ.

### 11.3 Email best effort

Sau commit cấp vé, `TicketEmailService.queueTicketsIssued()` chạy bất đồng bộ. `MailService` bắt lỗi và log, không làm giao dịch bán vé thất bại nếu SMTP chậm/hỏng.

Trade-off: người dùng có thể có vé nhưng email chưa đến. Đây là chủ đích về độ tin cậy transaction; source hiện chưa có retry worker sử dụng `OutboxEvent` dù model đó đã có trong schema.

### 11.4 Socket.IO realtime

`CheckinGateway` mở namespace `/realtime`. Client `createSocket('/realtime')` gửi JWT khi handshake; organizer/admin gửi event `subscribe` vào room `event:<eventId>`. Mỗi lần check-in `VALID`, `CheckinService` emit số người đã vào và hạng vé.

Realtime chỉ dùng để cập nhật dashboard nhanh; database vẫn là nguồn sự thật.

## 12. Object storage: Cloudinary signed direct upload

Ảnh avatar/cover không lưu binary trong PostgreSQL. Server tạo chữ ký upload (`POST /api/uploads/signature`), app upload trực tiếp file lên Cloudinary, rồi gọi `POST /api/uploads/complete`.

Tại `UploadsService`:

1. Kiểm tra target và ownership; cover chỉ được đổi khi event `DRAFT`.
2. Tạo `publicId` xác định theo target/user/event, ký bằng `CLOUDINARY_API_SECRET` chỉ nằm server.
3. Sau upload, server hỏi Cloudinary lại bằng `assetId`, `version`, format, kích thước <= 5 MB.
4. Chỉ khi verify xong mới lưu `secureUrl` vào `User.avatarUrl` hoặc `Event.coverImageUrl`.

Lợi ích: backend không phải làm proxy cho file lớn; secret không lộ app; URL chỉ được lưu sau khi server xác minh upload đúng asset.

## 13. Frontend Expo/React Native

### 13.1 Expo Router

Route là file trong `app/src/app`. Ví dụ:

- `app/src/app/event/[id].tsx` tương ứng `/event/:id`.
- `(attendee)` là route group không xuất hiện URL.
- `/organizer`, `/admin`, `/scanner` là area riêng.

Layout `app/src/app/organizer/_layout.tsx`, `admin/_layout.tsx`, `scanner/_layout.tsx` redirect người không có token/sai role. Đây là UX routing; backend guard vẫn là lớp bảo mật bắt buộc.

### 13.2 React component và hooks

Component là hàm trả JSX. Hooks chính trong source:

- `useState`: form, dialog, lọc local.
- `useEffect`: hydrate storage, countdown, Socket.IO lifecycle.
- `useMemo`: tránh tính lọc event/vé lại vô ích.
- `useRef`: lock đồng bộ chặn camera gọi nhiều lần; ref ViewShot.

Ví dụ trong `scanner/scan/[eventId].tsx`, chỉ dùng state `pending` là chưa đủ vì camera có thể bắn nhiều callback trước render kế tiếp. `lock.current = true` là synchronous guard.

### 13.3 TanStack Query: server state

TanStack Query quản lý dữ liệu từ API: cache, loading/error, refetch, invalidation. Ví dụ:

- `useQuery({ queryKey: ordersKeys.pending(), queryFn: getPendingOrders })`.
- Sau hủy đơn, `invalidateQueries({ queryKey: ordersKeys.pending() })` để lấy dữ liệu mới.
- `queryClient.clear()` khi login/logout để không lộ cache user cũ cho user mới.

Đây là **server state**, khác với UI state cục bộ như dialog đang mở.

### 13.4 Zustand và persistent client state

Zustand quản lý state nhỏ dùng xuyên màn hình:

- `auth-store.ts`: token, user, hydrate/signIn/signOut.
- `language-store.ts`: ngôn ngữ, đồng bộ best-effort locale server cho email.
- `theme-store.ts`: system/light/dark.

Token native dùng `expo-secure-store`; web fallback `localStorage` vì SecureStore không hỗ trợ web. Profile user và preference dùng AsyncStorage.

### 13.5 i18n và theme

`i18next` + `react-i18next` dùng hai dictionary `app/src/i18n/locales/vi.ts` và `en.ts`. App device là nguồn ngôn ngữ hiển thị; server locale là bản sao phục vụ email/CSV fallback.

Theme dùng design token/NativeWind:

- màu tập trung ở `app/src/design/tokens.ts`;
- `themes.ts` biến palette thành CSS variables;
- Root layout áp biến cho toàn cây;
- component dùng semantic class như `bg-surface`, `text-primary`, không hardcode màu rải rác.

## 14. Báo cáo, CSV và bảo mật spreadsheet

`StatisticsService` tạo thống kê tổng quan, chuỗi ngày 30 ngày và top event. Báo cáo CSV có hai loại:

- `SUMMARY`: tổng hợp theo sự kiện.
- `DETAIL`: từng dòng hạng vé/đơn đã paid.

Khoảng ngày parse theo giờ Việt Nam (`Asia/Ho_Chi_Minh`), tối đa 366 ngày. CSV thêm BOM UTF-8 để Excel đọc tiếng Việt tốt.

`escapeCsvValue()` quote giá trị, escape dấu `"`, và prefix apostrophe nếu text bắt đầu `=`, `+`, `-`, `@`, tab, CR/LF hoặc ký tự full-width tương đương. Đây là chống **CSV formula injection**: tên event do organizer nhập không được biến thành công thức khi admin mở Excel.

## 15. Testing, logging và observability

- Unit tests: `backend/test/unit/*.spec.ts`, tập trung signer QR, event lifecycle, mail, withdrawals.
- E2E tests: `backend/test/*e2e-spec.ts`, có auth locale, orders, payments, check-in, staff, notifications, admin moderation, withdrawals.
- Swagger UI `/docs` và OpenAPI `/docs-json` là contract có thể thử API.
- `nestjs-pino` tạo request id và redact `Authorization`, cookie, API key trong `backend/src/config/logger.config.ts`.
- `AllExceptionsFilter` trả error shape thống nhất và log stack cho lỗi 5xx.

Khi trả lời, không nói “đã test hết mọi trường hợp” nếu chưa chạy test ở môi trường demo. Hãy nói chính xác “source có các unit/e2e test cho các flow X; khi demo tôi chạy `npm test`, `npm run build` và test thiết bị cho camera/QR”.

## 16. Những giới hạn thật cần nói trung thực

1. Chưa có Google OAuth dù schema có `googleSubject`; UI login không hiển thị Google.
2. Notification hiện là in-app database, chưa gửi push OS.
3. `TicketStatus.VOID` có enum/UI filter nhưng source chưa có flow void/refund thực sự.
4. `salesStartAt`/`salesEndAt` được nhập và validate thứ tự, nhưng `OrdersService.create()` hiện chưa kiểm tra cửa sổ bán trước khi đặt.
5. Hệ thống không tự chuyển tiền cho organizer; admin chuyển thủ công rồi ghi `PAID` cho withdrawal.
6. Không có refund/cancel paid order tự động, không có cổng thanh toán thẻ/MoMo/VNPay.
7. Socket gateway xác thực chữ ký JWT + user status nhưng không kiểm tra `AuthSession` revoke như HTTP guard; đây là điểm có thể cải tiến.
8. `OutboxEvent` đã có schema nhưng source chưa có worker retry cho email/notification external side effect.

Đây không phải “lỗi phải che giấu”. Khi được hỏi hạn chế, nêu đúng rồi đề xuất hướng nâng cấp là câu trả lời trưởng thành.
