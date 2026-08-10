# eTicket – Cheat Sheet trước khi vào phòng thi

## 1. Một câu mô tả project

**eTicket là nền tảng quản lý vé sự kiện đa vai trò: organizer tạo event, admin duyệt, attendee đặt và thanh toán VietQR, hệ thống cấp QR ticket có chữ ký HMAC, scanner check-in atomically và organizer/admin theo dõi vận hành/doanh thu.**

## 2. Stack và vai trò

| Công nghệ | Nhớ một câu |
| --- | --- |
| Expo + React Native | Một codebase app mobile/web |
| Expo Router | Route từ cấu trúc file |
| TanStack Query | Cache và server state/API mutation |
| Zustand | Auth/language/theme state phía client |
| NativeWind + tokens | UI semantic light/dark nhất quán |
| i18next | VI/EN từ translation key |
| NestJS | Module/controller/service/DI backend |
| PostgreSQL | Relational source of truth |
| Prisma | Schema, type-safe query, transaction |
| JWT + Passport | Bearer authentication |
| AuthSession | Revoke session/logout/password change |
| bcrypt | Hash password |
| HMAC-SHA256 | Ký QR ticket chống giả |
| SePay webhook | Nguồn xác nhận transfer payment |
| Cloudinary | Lưu ảnh qua signed direct upload |
| Socket.IO | Dashboard check-in realtime |
| Nodemailer | Email vé best effort |

## 3. Role và quyền

| Role | Làm gì? |
| --- | --- |
| ATTENDEE | Khám phá, order, pending VietQR, tickets/QR, profile |
| ORGANIZER | Draft event/ticket type, submit review, staff device, stats, withdrawal |
| SCANNER | Kết nối bằng code một lần, chỉ quét event được `EventStaff` gán |
| ADMIN | Duyệt/block organizer, approve/feature/hide event, review payment/withdrawal |

**Câu nhớ:** UI redirect chỉ là trải nghiệm; backend mới enforce bằng `JwtAuthGuard` + `RolesGuard` + ownership/EventStaffGuard.

## 4. Trạng thái phải thuộc

### Event

```text
DRAFT -> PENDING_REVIEW -> PUBLISHED -> CANCELLED
              |                 |
              v                 v
            DRAFT             HIDDEN -> PUBLISHED (admin unhide)
                                  |
                                  v
                                DRAFT (organizer fix)
```

- Organizer `publish` = gửi duyệt, không public ngay.
- `featured=true` chỉ admin bật và event phải PUBLISHED.
- Hide event: clear featured + cancel all PENDING orders + notify organizer.

### Order / Ticket / Withdrawal

```text
Order:      PENDING -> PAID | EXPIRED | CANCELLED
Ticket:     ISSUED -> USED    (VOID future, chưa có flow)
Withdrawal: PENDING -> APPROVED -> PAID
                     -> REJECTED / CANCELLED
```

## 5. Công thức business logic

```text
reserved ticket = SUM(OrderItem.quantity)
                  where Order.status in (PENDING, PAID)

remaining = TicketType.quantityTotal - reserved

withdrawable revenue = PAID order revenue of events ended
available withdrawal = settledRevenue - open(PENDING/APPROVED) - PAID withdrawals
```

`PENDING` phải tính reservation để không oversell. Khi EXPIRED/CANCELLED, row không còn được tính nên inventory tự release.

## 6. Flow mua vé phải kể được

```text
Attendee chọn hạng vé
  -> POST /orders
  -> lock user + lock ticket types
  -> check remaining + calculate price from DB
  -> free: PAID + tickets ngay
  -> paid: PENDING + VietQR + expiresAt
  -> SePay webhook
  -> conditionally PENDING -> PAID
  -> tickets + Payment MATCHED + notification cùng transaction
  -> email sau commit
```

### Ba guard chống lỗi

1. `FOR UPDATE` ticket types chống oversell.
2. Unique `[buyerId, clientRequestId]` chống order retry duplicate.
3. Unique `Payment.sepayTxnId` chống webhook duplicate.

## 7. Flow check-in phải kể được

```text
QR = code.signature
  -> verify HMAC first
  -> find ticket
  -> verify belongs to event
  -> UPDATE Ticket WHERE status=ISSUED
  -> 1 row = VALID; 0 row = re-read ALREADY_USED/INVALID
  -> always write CheckinLog
  -> VALID emits Socket.IO event room
```

**Câu vàng:** HMAC chống QR giả; database status mới chống QR dùng hai lần.

## 8. Security nhanh

| Chủ đề | Câu trả lời |
| --- | --- |
| Password | bcrypt hash, không lưu plaintext |
| Login enumeration | dummy bcrypt hash khi email không tồn tại |
| JWT logout | JWT chứa `sid`; DB `AuthSession` kiểm tra revoke/expiry |
| Permission | role guard + owner query + event staff relation |
| Webhook | SePay API key constant-time, idempotent transaction id |
| QR | random code + HMAC SHA-256 + timingSafeEqual |
| Upload | server signed params, Cloudinary verify asset/format/size before save URL |
| CSV | quote/escape + prefix apostrophe formula chars |
| Logs | Pino redact authorization/cookie/API key |

## 9. Transaction/concurrency nhanh

| Khái niệm | Ví dụ project |
| --- | --- |
| Transaction | paid order + tickets + payment + notification cùng commit |
| Pessimistic lock | `SELECT ... FOR UPDATE` ticket type/user/event |
| CAS/guarded update | `updateMany where status=expected`, check count |
| Idempotency | clientRequestId, sepayTxnId |
| Atomic consume | `UPDATE Ticket WHERE status='ISSUED'` |
| Race handled | payment vs expiry/cancel, double scan, concurrent withdrawal |

## 10. Frontend state nhanh

```text
useState/useRef      = dialog/form/filter/camera synchronous lock
Zustand              = token, current user, language, theme
TanStack Query       = API data/cache/loading/error/invalidation
SecureStore          = native JWT
AsyncStorage         = user preference/profile cached/city
```

- `queryClient.clear()` khi sign in/out để tránh user mới thấy cache user cũ.
- `useRef` camera lock vì `setState` async, barcode callback có thể bắn nhiều lần trước rerender.
- App maps stable backend `ErrorCode` sang i18n string, không hiển thị raw server message là chính.

## 11. Những đường dẫn/file quan trọng

| Nếu bị hỏi | File mở đầu |
| --- | --- |
| Schema, relation, enum | `backend/prisma/schema.prisma` |
| Bootstrap/validation/swagger | `backend/src/main.ts` |
| Config env | `backend/src/config/configuration.ts`, `env.validation.ts` |
| Auth/session | `backend/src/modules/auth/auth.service.ts`, `jwt.strategy.ts` |
| Event lifecycle | `backend/src/modules/events/events-organizer.service.ts` |
| Public discovery/remaining | `backend/src/modules/events/events.service.ts` |
| Orders/oversell | `backend/src/modules/orders/orders.service.ts` |
| Webhook | `backend/src/modules/payments/payments.service.ts` |
| QR | `backend/src/modules/tickets/ticket-signer.service.ts` |
| Check-in | `backend/src/modules/checkin/checkin.service.ts` |
| Admin | `backend/src/modules/admin/admin.service.ts` |
| Cloudinary | `backend/src/modules/uploads/uploads.service.ts` |
| Statistics/CSV | `backend/src/modules/statistics/statistics.service.ts` |
| Withdrawal | `backend/src/modules/withdrawals/withdrawals.service.ts` |
| App API client | `app/src/lib/api/client.ts` |
| Auth client store | `app/src/stores/auth-store.ts` |
| App root provider | `app/src/app/_layout.tsx` |

## 12. Hạn chế thật – đừng trả lời quá

1. Chưa Google OAuth, chỉ email/password + scanner connect code.
2. Notification là in-app database, chưa push OS.
3. Ticket `VOID` chưa có action/refund flow set status đó.
4. Sales window có input/validation thứ tự nhưng checkout chưa enforce time window.
5. Payment review và organizer payout đều cần admin/manual bank action.
6. Email best effort, chưa outbox worker retry dù schema có `OutboxEvent`.
7. Socket gateway chưa kiểm tra revoked `AuthSession` như HTTP strategy.
8. BigInt DTO convert Number; scale tiền cực lớn nên chuyển money API thành string/decimal.

## 13. TOP 20 KIẾN THỨC QUAN TRỌNG NHẤT

1. **RBAC:** backend kiểm tra role, không tin UI.
2. **Ownership:** organizer query luôn kèm `organizerId`; scanner cần `EventStaff`.
3. **JWT + session:** JWT nhận diện token, AuthSession hỗ trợ revoke.
4. **bcrypt:** chỉ hash password, compare lúc login.
5. **DTO + ValidationPipe:** validate whitelist/forbid field lạ toàn cục.
6. **State machine:** event/order/ticket/withdrawal có transition hợp lệ.
7. **Transaction/ACID:** group thay đổi liên quan all-or-nothing.
8. **Row lock:** `FOR UPDATE` chống inventory race.
9. **CAS:** update với old state tránh overwrite concurrent result.
10. **Idempotency:** order client key + SePay transaction id chống duplicate.
11. **Reservation:** PENDING và PAID đều giữ chỗ.
12. **Payment source of truth:** webhook SePay, không phải thao tác app.
13. **Late/mismatch payment:** manual review, không cấp ticket tự động.
14. **QR HMAC:** code random + signature server secret chống giả.
15. **Exactly-once check-in:** update ticket only if status ISSUED.
16. **DB notification:** còn unread/lịch sử sau khi user offline; chưa OS push.
17. **Signed direct upload:** Cloudinary secret ở server, verify asset trước persist URL.
18. **TanStack Query vs Zustand:** server cache vs client global state.
19. **BigInt/price snapshot:** tiền chính xác, lịch sử giá không đổi.
20. **Hạn chế/roadmap:** outbox, push, refund/payout automation, sales-window enforcement, Socket session parity.

## 14. 10 câu đáp “một hơi”

1. **Tại sao lock?** Để hai request không cùng bán chiếc vé cuối; request sau phải tính lại số còn sau request trước.
2. **Tại sao PENDING giữ stock?** User đang checkout nhưng chưa trả; không giữ thì có thể oversell.
3. **Tại sao webhook?** Chỉ payment provider mới xác nhận money reliably, client không phải nguồn tin cậy.
4. **Tại sao HMAC?** QR không chỉ là id công khai; signature khiến attacker không tự tạo payload hợp lệ.
5. **Tại sao DB vẫn check vé?** Signature không biết vé đã dùng/chỉ event nào; DB giữ state.
6. **Tại sao notification lưu DB?** User offline vẫn thấy lại và có unread badge.
7. **Tại sao email sau commit?** SMTP fail không được rollback ticket đã bán.
8. **Tại sao event cần admin?** Kiểm duyệt nội dung và featured là quyền platform, organizer không tự quyết.
9. **Tại sao Cloudinary direct?** File không đi qua API, nhưng server vẫn ký/verify để giữ quyền kiểm soát.
10. **Hạn chế lớn?** Chưa push/refund/payout auto; có roadmap outbox/payment integration và validate sales window.
