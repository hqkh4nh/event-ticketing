# Bộ câu hỏi và trả lời vấn đáp

> Cách học: đọc câu trả lời ngắn trước. Nếu bị hỏi sâu, mở phần “Xem thêm” hoặc các file trong `LOGIC.md`/`FLOWS.md`.

## A. Câu hỏi cơ bản

### 1. Đề tài của bạn giải quyết bài toán gì?

eTicket hỗ trợ vòng đời vé sự kiện: organizer tạo sự kiện và hạng vé, admin duyệt để công khai, attendee đặt/thanh toán VietQR, hệ thống cấp QR ticket, scanner quét tại cổng, organizer/admin theo dõi vận hành và doanh thu.

### 2. Hệ thống có những role nào?

`ATTENDEE`, `ORGANIZER`, `SCANNER`, `ADMIN` trong enum `Role` của Prisma. Attendee mua vé; organizer tạo/quản lý event; scanner check-in theo event được gán; admin duyệt và điều hành nền tảng.

### 3. Công nghệ frontend và backend là gì?

Frontend là Expo 54, React Native, Expo Router, TanStack Query, Zustand, NativeWind, i18next. Backend là NestJS 11, TypeScript, Prisma 7, PostgreSQL, JWT/Passport; dùng Cloudinary, SePay, Socket.IO, Nodemailer theo feature.

### 4. Vì sao frontend và backend tách riêng?

Frontend tối ưu trải nghiệm đa nền tảng; backend tập trung validation, quyền, transaction và database. Tách như vậy không để client quyết định giá/stock/quyền, đồng thời có thể mở thêm web/mobile client mà dùng cùng API.

### 5. NestJS module là gì? Project chia module thế nào?

Module gom controller, service và dependency theo domain. Project có Auth, Events, Orders, Payments, Tickets, Checkin, Staff, Admin, Notifications, Uploads, Statistics, Withdrawals, Mail, Realtime. `AppModule` import chúng.

### 6. Controller và service khác nhau gì?

Controller xử lý HTTP: route, DTO, params/current user. Service chứa business logic/database. Ví dụ `OrdersController.create` rất mỏng, còn `OrdersService.create` xử lý lock stock, giá, pending order và issue ticket.

### 7. Prisma là gì và dùng để làm gì?

Prisma là ORM/type-safe database client. `schema.prisma` mô tả bảng, enum, relation, unique/index; `PrismaService` kết nối PostgreSQL và service dùng Prisma query/transaction.

### 8. DTO là gì?

DTO là object mô tả dữ liệu qua API. Nó kiểm tra request có đúng field, type và constraint trước khi service xử lý. DTO không phải database model.

### 9. Tại sao dùng `class-validator`?

Để rule input khai báo gần DTO và áp dụng nhất quán qua global `ValidationPipe`: UUID, số lượng, email, độ dài, enum, nested array… Server không tin dữ liệu từ app.

### 10. REST API là gì trong project này?

REST tổ chức endpoint quanh tài nguyên và HTTP methods. Ví dụ `GET /events` đọc, `POST /orders` tạo đơn, `PATCH /auth/me` cập nhật profile; các action domain như `POST /admin/events/:id/approve` biểu đạt hành động duyệt.

### 11. JWT là gì?

JWT là token có payload được server ký, app gửi qua `Authorization: Bearer`. Project lưu `sub` user id, `sid` session id và expiration; Passport verify signature/expiry.

### 12. Authentication khác authorization thế nào?

Authentication xác định ai đang gọi API. Authorization kiểm tra người đó có quyền action không. Project dùng JWT + AuthSession cho authentication, `RolesGuard`, `EventStaffGuard`, ownership query cho authorization.

### 13. Vì sao password không lưu plaintext?

Nếu database lộ, plaintext làm lộ toàn bộ account và có thể bị dùng lại ở nơi khác. Project hash bcrypt khi register/change password và chỉ compare hash lúc login.

### 14. Event status có những trạng thái nào?

`DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `CANCELLED`, `HIDDEN`. Draft là editable; pending chờ admin; published public; cancelled là organizer dừng event; hidden là admin tạm gỡ public có lý do.

### 15. Vì sao cần notification table?

Để thông báo tồn tại sau khi user offline/logout, có unread badge và lịch sử đọc. Project hiện dùng in-app persisted notification; Attendee, Organizer và Admin poll API mỗi 3 giây khi app active, chưa phải push OS.

### 16. QR ticket lưu gì?

Payload là `code.signature`, trong đó signature là HMAC-SHA256 của code với secret server. Ticket record DB vẫn có status, event relation và thông tin sử dụng.

### 17. Cloudinary dùng để làm gì?

Lưu ảnh avatar và cover event. Database chỉ lưu `secureUrl`; app upload direct qua signed request, server verify asset trước persist URL.

### 18. TanStack Query dùng để làm gì?

Quản lý server state/caching/loading/error/refetch/mutation. Ví dụ cache orders, tickets, events, notifications. Nó khác Zustand, vì data từ server cần invalidation/stale handling.

### 19. Zustand dùng để làm gì?

Quản lý state global phía client: auth token/user, ngôn ngữ, theme. Nó không thay thế database/API cache.

### 20. i18n được triển khai như thế nào?

`i18next` dùng dictionary `vi.ts` và `en.ts`. UI render theo translation key. Server lưu locale để gửi email/CSV fallback; thiết bị là nguồn language hiển thị.

## B. Câu hỏi trung bình

### 21. Organizer đăng ký xong có tạo event ngay không?

Không. Organizer được tạo `PENDING`. Họ có thể login nhưng `RolesGuard` trả `ACCOUNT_PENDING_APPROVAL` với action organizer cho đến khi admin đổi account thành `ACTIVE`.

### 22. Luồng duyệt event là gì?

Organizer tạo DRAFT, thêm ít nhất một ticket type, gửi `POST /organizer/events/:id/publish` để thành `PENDING_REVIEW`. Admin gọi approve để chuyển `PUBLISHED`; đồng thời transaction tạo notification cho organizer.

### 23. Tại sao organizer không tự bật Featured?

Featured là quyết định editorial/moderation của nền tảng nên endpoint chỉ nằm ở `AdminService.updateEventFeatured`. Server chỉ cho `featured=true` nếu event đang published, không dựa vào UI hide/show.

### 24. Pending order là gì và vì sao phải có?

Đó là order đã chọn vé, chưa có callback thanh toán, có `expiresAt` và giữ inventory. Nó tạo thời gian user chuyển khoản nhưng vẫn không cho người khác bán quá stock.

### 25. Tại sao chỉ cho tối đa 3 đơn pending mỗi attendee?

Tránh một account giữ chỗ quá nhiều event/seat mà không thanh toán. `OrdersService` lock buyer row rồi count PENDING unexpired trước create, nên request đồng thời không lách limit.

### 26. Hệ thống chống oversell như thế nào?

Trong transaction, lock các TicketType bằng `SELECT ... FOR UPDATE`, tính reservation từ OrderItem của order PENDING/PAID, reject nếu requested vượt remaining. Ticket type lock được sort id để giảm deadlock.

### 27. Tại sao PENDING cũng tính vào số vé đã bán/giữ?

Để chống oversell trong thời gian chờ thanh toán. PENDING là reservation, hết hạn/hủy sẽ thành EXPIRED/CANCELLED nên tự không được tính nữa.

### 28. Sự khác nhau PENDING, EXPIRED, CANCELLED order?

PENDING: chờ payment và còn hạn. EXPIRED: cron tự đổi khi quá hạn. CANCELLED: attendee chủ động hủy còn hạn hoặc admin hide event hủy pending holds. Cả EXPIRED/CANCELLED release inventory.

### 29. Khi payment thành công thì ticket được tạo ở đâu?

Webhook SePay vào `PaymentsService.handleSepayWebhook`. Nếu order match, pending và chưa hết hạn, service đổi `PAID`, gọi `TicketsService.issue` cho mỗi `OrderItem`, tạo `Payment MATCHED` và notification trong cùng transaction.

### 30. Vì sao không cấp ticket ngay khi user nhấn “Tôi đã thanh toán”?

Client không là nguồn xác nhận tiền tin cậy. Backend chỉ cấp khi SePay callback hợp lệ, amount/content match và order còn payable. Điều này ngăn fake payment/ticket.

### 31. Idempotency là gì? Project dùng ở đâu?

Là khả năng request lặp lại không nhân đôi kết quả. Project dùng unique `[buyerId, clientRequestId]` cho tạo order và `Payment.sepayTxnId` cho webhook, nên retry không tạo thêm order/ticket.

### 32. Payment tiền sai hoặc đến muộn xử lý ra sao?

Lưu payment `UNMATCHED` nếu không match code/amount, hoặc `REVIEW_REQUIRED` nếu order expired/cancelled/already paid. Không tự cấp vé; admin thấy queue để đối soát ngoài hệ thống.

### 33. Cron hết hạn đơn chạy thế nào?

`OrdersExpiryService` có `@Cron(EVERY_30_SECONDS)`, conditional update `PENDING` quá `expiresAt` sang `EXPIRED`. Vì availability query chỉ count PENDING/PAID, không cần cộng stock riêng.

### 34. QR chống giả thế nào?

Server sinh random code và HMAC-SHA256 signature bằng secret. Scanner verify HMAC bằng `timingSafeEqual` trước query database. Tự tạo code mà không biết secret sẽ có signature invalid.

### 35. Tại sao QR hợp lệ vẫn có thể không vào được?

QR chứng minh payload do server tạo, không chứng minh trạng thái hiện tại. Vé có thể đã `USED`, thuộc event khác hoặc không còn record; check-in vẫn query DB và atomically consume status.

### 36. Chống quét trùng vé như thế nào?

`UPDATE Ticket ... WHERE id=? AND status='ISSUED'`. Chỉ một scanner update được 1 row và trả VALID; scanner còn lại update 0 row, reread status rồi trả ALREADY_USED.

### 37. Tại sao check-in ticket đã dùng vẫn HTTP 200?

`ALREADY_USED` là business result mà app scanner phải hiển thị, không phải request format/auth/server failure. HTTP 4xx/5xx chỉ dành cho lỗi protocol/security/system.

### 38. Scanner có được quét mọi event không?

Không. `EventStaffGuard` kiểm tra composite relation `EventStaff(eventId,userId)`. Chỉ scanner được organizer gán event đó, admin bypass theo quyền quản trị.

### 39. Lưu ảnh ticket làm bằng gì?

`react-native-view-shot` capture component `TicketImageCard` thành ảnh; `expo-media-library` xin permission và lưu ảnh vào thư viện. Nó không tạo QR server-side; QR payload đã có từ API.

### 40. Vì sao upload ảnh dùng signed direct upload?

App upload thẳng Cloudinary nên backend không phải nhận file lớn; server giữ API secret để ký params và verify resource về sau. URL chỉ được persist sau ownership/status/file size/format verify.

## C. Câu hỏi nâng cao

### 41. Transaction là gì? ACID được thể hiện thế nào?

Transaction là nhóm thao tác all-or-nothing. Payment success tạo paid order, tickets, payment record, notification cùng commit (atomicity). Row lock/guarded update hỗ trợ isolation. PostgreSQL commit đảm bảo durability.

### 42. `FOR UPDATE` khác `updateMany` condition thế nào?

`FOR UPDATE` là pessimistic lock: request khác phải chờ row khi cùng flow hợp tác, dùng cho stock/pending withdrawal/event edit. `updateMany WHERE old state` là compare-and-set/optimistic guard: chỉ update nếu trạng thái vẫn như kỳ vọng. Project dùng cả hai theo rủi ro.

### 43. Tại sao lock ticket types theo `ORDER BY id`?

Để mọi transaction multi-ticket-type lấy lock cùng thứ tự. Nếu A giữ X chờ Y, B giữ Y chờ X thì deadlock; fixed order giảm tình huống này.

### 44. Race webhook và expiry được giải quyết cụ thể ra sao?

Webhook chỉ paid nếu `status=PENDING AND expiresAt>now`; cron chỉ expire nếu `status=PENDING AND expiresAt<now`. Hai update condition chạy atomic; chỉ một thắng, bên kia không overwrite state.

### 45. Tại sao tạo notification trong transaction?

Approval/ticket issuance và notification là cùng business fact. Đặt cùng transaction tránh event/ticket commit mà notification thiếu vì lỗi trước khi create; rollback cũng không lưu notification mồ côi.

### 46. Vì sao gửi email không trong transaction?

SMTP là external side effect, không tham gia rollback PostgreSQL. Chờ SMTP làm transaction chậm và mail fail có thể rollback ticket đã cấp. Project commit data trước, queue best-effort email sau; trade-off là cần retry/outbox để bảo đảm delivery.

### 47. Outbox pattern là gì và project đã dùng chưa?

Outbox là pattern ghi “event cần publish” cùng business transaction, sau đó worker xử lý và retry external delivery. Project hiện chưa có Outbox model hoặc worker; email vẫn là best effort sau commit. Đây là hướng nâng cấp cho email/push đáng tin cậy hơn.

### 48. Vì sao database money dùng BigInt nhưng DTO trả number?

BigInt tránh precision error trong domain VND. JSON không serialize BigInt; DTO hiện convert Number cho phạm vi demo. Với doanh thu cực lớn cần output string/decimal để tránh vượt `Number.MAX_SAFE_INTEGER`; CSV đã stringify BigInt trực tiếp.

### 49. Tại sao payment review không đổi `PaymentStatus` khi admin resolve?

`PaymentStatus` giữ lý do tiền vào queue (`UNMATCHED`/`REVIEW_REQUIRED`). Việc admin đã xử lý được biểu diễn bằng `reviewedAt`, `reviewedById`, `adminNote`, tránh làm mất nguyên nhân audit.

### 50. Withdrawal balance được tính như thế nào?

`available = revenue PAID của event đã kết thúc - amount của request PENDING/APPROVED - amount đã PAID`. Service lock user khi create request để concurrent request không rút vượt số dư.

### 51. Tại sao bank information snapshot trên WithdrawalRequest?

Thông tin tài khoản được copy khi request tạo. Sau này organizer đổi profile/bank thì lịch sử vẫn nói đúng tài khoản đã dùng cho request đó, thuận lợi audit/đối soát.

### 52. CSV formula injection là gì và project xử lý thế nào?

Nếu cell bắt đầu `=`, `+`, `-`, `@`… spreadsheet có thể chạy formula khi mở CSV. Event title do organizer nhập nên `escapeCsvValue` quote cell và prefix apostrophe cho ký tự nguy hiểm, kể cả newline/full-width variants.

### 53. Tại sao report dùng timezone Việt Nam?

Ngày doanh thu người Việt đọc theo UTC+7. `StatisticsService` parse `YYYY-MM-DD` thành mốc Việt Nam, dùng end-exclusive và raw SQL `AT TIME ZONE 'Asia/Ho_Chi_Minh'` cho daily group.

### 54. Notification i18n xử lý ở server hay client?

Server lưu notification `type` và structured data, client map type thành translation key. Điều này cho phép một record hiển thị VI/EN theo preference hiện tại, không lưu sentence cứng.

### 55. Realtime Socket.IO có thay database không?

Không. Socket chỉ push event check-in valid để dashboard cập nhật nhanh. Ticket status/audit/count vẫn ở PostgreSQL; nếu socket mất kết nối screen có thể refetch database.

### 56. Gateway Socket hiện có điểm gì cần cải tiến?

`CheckinGateway.authenticate` verify JWT và user status, nhưng chưa kiểm tra `AuthSession.revokedAt` như `JwtStrategy` HTTP. Nên tái dùng/đồng bộ session validation để logout/password change thu hồi realtime connection đầy đủ.

### 57. Feature sales window có đầy đủ chưa?

Chưa hoàn toàn. Event ticket type form/service validate `salesStartAt < salesEndAt`, nhưng checkout hiện chưa reject khi now nằm ngoài window. Cần thêm condition trong `OrdersService.create` và e2e test.

### 58. `TicketStatus.VOID` có ý nghĩa gì và source đã dùng chưa?

VOID là trạng thái thiết kế cho vé bị vô hiệu hóa, phù hợp future refund/cancel/chargeback. Schema/UI filter có nó, nhưng source hiện chưa có flow set VOID; không nên nói cancellation paid order đã void ticket.

### 59. Google login đã có chưa?

Chưa. Schema có `googleSubject` để mở rộng, nhưng auth controller/service/frontend hiện chỉ có email/password và scanner connect code; login Google đã ẩn khỏi UI.

### 60. Hạn chế lớn nhất và hướng phát triển?

Chưa có refund/payment gateways khác/push OS/payout automatic; sales window chưa enforce; email chưa outbox retry; socket session parity chưa đủ. Hướng phát triển: payment gateway, ledger/refund, Expo push token + outbox, enforce sales window, audit/admin action log, analytics pagination/large-money serialization.

### 61. Thông báo “gần realtime” được triển khai thế nào?

TanStack Query gọi lại unread count mỗi 3 giây ở layout Attendee, Organizer và Admin; khi tab thông báo mở, danh sách cũng được poll. Root layout dùng `AppState` + `focusManager` để dừng khi app native chạy nền. Đây là polling nên không phải push OS hoặc WebSocket và có độ trễ khoảng một chu kỳ cộng thời gian mạng.

---

# TOP 30 CÂU HỎI CẦN HỌC THUỘC

Đây là 30 câu ưu tiên cao nhất. Số trong ngoặc trỏ tới phần trả lời đầy đủ phía trên.

1. Bài toán eTicket và 4 role là gì? (1–2)
2. Kiến trúc frontend/backend/database của project? (3–4)
3. Controller, service, module khác nhau thế nào? (5–6)
4. Prisma schema có những quan hệ cốt lõi nào? (7)
5. DTO/ValidationPipe có tác dụng gì? (8–9)
6. JWT, AuthSession và lý do dùng cả hai? (11, 42)
7. Bcrypt và DUMMY_HASH để làm gì? (13, CODE_EXPLANATION §3)
8. Authentication vs authorization? (12)
9. RBAC/ownership/EventStaffGuard bảo vệ ra sao? (2, 38)
10. Organizer đăng ký và admin approve thế nào? (21)
11. State machine event gồm các trạng thái nào? (14, 22)
12. “Publish” organizer có thực sự public ngay không? (22)
13. Admin featured có rule gì? (23)
14. Pending order là gì? (24)
15. Vì sao pending order giới hạn 3? (25)
16. Công thức availability và lý do count PENDING? (26–27)
17. Chống oversell bằng transaction/row lock ra sao? (26, 42–43)
18. Idempotency là gì, dùng ở đâu? (31)
19. Payment flow webhook SePay như thế nào? (29–30)
20. Race payment webhook và expiry/cancel xử lý ra sao? (33, 44)
21. Tiền sai/đến muộn làm gì? (32)
22. QR ticket có cấu trúc gì, chống giả thế nào? (16, 34–35)
23. Chống scan vé hai lần như thế nào? (36)
24. Vì sao result check-in sai vẫn trả HTTP 200? (37)
25. Cloudinary signed direct upload hoạt động ra sao? (40)
26. In-app notification khác push và polling 3 giây hoạt động thế nào? (15, 61)
27. TanStack Query và Zustand dùng khác nhau thế nào? (18–19)
28. Statistics/CSV chỉ lấy PAID và chống formula injection ra sao? (52–53)
29. Withdrawal balance và lifecycle thế nào? (50–51)
30. Các giới hạn hiện tại/hướng phát triển? (56–61)
