---
name: eTicket
spec: docs/specs/2026-07-09-event-ticketing.md
foundation: Material 3 roles, Ember palette
defaultMode: system
implementation: app/src/design/tokens.ts
colors:
  surface: '#fbf7f4'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f1ed'
  surface-container: '#f1ebe6'
  surface-container-high: '#ebe4de'
  on-surface: '#1b1720'
  on-surface-variant: '#6b6472'
  outline: '#8b8391'
  outline-variant: '#e4dcd5'
  primary: '#c7361a'
  on-primary: '#ffffff'
  primary-container: '#ffe3db'
  on-primary-container: '#7a2a17'
  secondary: '#a93349'
  on-secondary: '#ffffff'
  secondary-container: '#fe7488'
  on-secondary-container: '#730425'
  tertiary: '#9b4426'
  on-tertiary: '#ffffff'
  tertiary-container: '#f38764'
  on-tertiary-container: '#6c2106'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  success: '#0f7350'
  on-success: '#ffffff'
  success-container: '#a6f2ce'
  on-success-container: '#00382a'
  warning: '#8a5300'
  on-warning: '#ffffff'
  warning-container: '#ffddb3'
  on-warning-container: '#2c1700'
colorsDark:
  surface: '#16141b'
  surface-container-lowest: '#221e2a'
  surface-container-low: '#1c1924'
  surface-container: '#272430'
  surface-container-high: '#2c2734'
  on-surface: '#f1edf4'
  on-surface-variant: '#a79fb0'
  outline: '#786f82'
  outline-variant: '#302b39'
  primary: '#ff6b4a'
  on-primary: '#2a0f07'
  primary-container: '#3a241d'
  on-primary-container: '#ffb4a1'
  secondary: '#ffb2b9'
  on-secondary: '#5f1122'
  secondary-container: '#891933'
  on-secondary-container: '#ffdadc'
  tertiary: '#ffb59e'
  on-tertiary: '#5b1c00'
  tertiary-container: '#7c2d11'
  on-tertiary-container: '#ffdbd0'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  success: '#34d399'
  on-success: '#05271c'
  success-container: '#123227'
  on-success-container: '#6ee7b7'
  warning: '#ffb95c'
  on-warning: '#4a2800'
  warning-container: '#693c00'
  on-warning-container: '#ffddb3'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-sm:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  label-sm:
    fontFamily: Be Vietnam Pro
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.05em
  numeric-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    fontVariantNumeric: tabular-nums
  code:
    fontFamily: JetBrains Mono
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  ctl: 12px
  md: 0.75rem
  card: 16px
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-padding: 20px
  gutter: 16px
  touch-target-min: 48px
  cta-height: 52px
  bottom-nav-height: 80px
---

## Brand & Style

Ứng dụng phục vụ trọn vòng đời sự kiện cho bốn vai trò: Attendee mua/đăng ký vé, Organizer dựng sự kiện và theo dõi dashboard, Scanner soát vé tại cửa, Admin quản trị. Tính cách thương hiệu: gọn gàng, đáng tin, không gây căng thẳng.

Thẩm mỹ theo hệ nhận diện **Ember**: nền mực/giấy ấm (Ink/Paper), coral làm màu thương hiệu, mint dành riêng cho trạng thái thành công. Bảng màu đó chở trên bộ **role Material 3** mà sản phẩm thật sự vẽ ra — đã bỏ nhóm `*-fixed`, `inverse-*`, `surface-dim/bright/highest` vì không màn hình nào dùng. Một token không ai render là một token sẽ trôi lệch.

Nguyên tắc chi phối mọi quyết định còn lại: **màn hình soát vé và màn hình vé QR là hai màn hình quan trọng nhất**. Chúng chạy trong hội trường tối, dưới áp lực thời gian, thường bởi nhân sự thời vụ. Mọi thứ khác trong hệ thống này nhường chỗ cho hai màn hình đó.

## Chất liệu vé

Bản sắc của eTicket nằm trong logo mark (`app/assets/images/eticket-mark.svg`): squircle coral, chữ `e` ở giữa, và một hàng **chấm perforation** dọc cạnh phải gợi hình chiếc vé. Dùng đúng **một** mark này ở mọi nơi — splash, auth, header, vé — và wordmark là `eTicket` với chữ `e` tô coral. Đường **răng cưa** và **khấc vé** là ngôn ngữ hình ảnh mở rộng ra thẻ và vé.

- **Đường răng cưa là chrome. Poster là nội dung.** Ảnh sự kiện dẫn dắt; khung vé chỉ đóng vai trò chất liệu quanh nó. Component `TicketSurface` là hiện thân của quy tắc này.
- **Khấc vé sống trên thẻ, giờ đã đọc được.** Nền Ink (`#16141b`) và thẻ (`#221e2a`) đủ khác màu để khấc — hình tròn tô màu nền treo nửa ngoài mép thẻ tại đường xé — đọc ra thành "vết cắn". Ở chế độ Paper hai bề mặt sát nhau hơn, nên khấc thêm một viền hairline để vẫn nhìn ra. `TicketSurface` là hiện thân: khấc hai cạnh + đường răng cưa, chung ngôn ngữ với logo mark. (Bản cũ nền sáng sát nhau nên đã bỏ khấc; bảng màu Ember phân tầng đủ mạnh để dựng lại.)
- **Một màu nhấn thương hiệu: coral.** Mint chỉ cho trạng thái "còn hiệu lực"; đỏ mận (`secondary`) chỉ cho nhãn khuyến mãi thật. Trạng thái "đang chọn" luôn là `primary` — kể cả khi chọn hạng vé. Hai màu nhấn tranh nhau là thứ khiến bản tham chiếu trông như sinh tự động.
- **Không lặp nhãn phân loại viết hoa trên mỗi thẻ.** Poster đã nói lên thể loại. Một nhãn viết hoa giãn chữ lặp lại trên từng thẻ là dấu hiệu rõ nhất của giao diện sinh máy.
- **Mono chỉ dành cho mã vé**, vì DESIGN.md yêu cầu đọc và gõ tay `code` khi máy quét hỏng. Đó là lý do chức năng. Số tiền và bộ đếm dùng Be Vietnam Pro với `tabular-nums` (component `NumericText`), không cần thêm một họ chữ nữa.

## Colors

Nền chế độ sáng là **Paper** (`surface: #fbf7f4`) — trắng ấm, không phải xanh-trắng lạnh và không phải trắng tinh. Nền chế độ tối là **Ink** (`surface: #16141b`) — mực ấm gần đen, không bao giờ đen tuyền, giữ chiều sâu trong hội trường tối. Trắng tinh (`surface-container-lowest`) dành cho thẻ ở chế độ sáng; ở chế độ tối thẻ là `#221e2a`, nổi lên khỏi Ink một bậc đủ thấy.

- **Primary (Coral):** hành động chính, giá tiền, link, tab đang chọn. Coral chạy **hai giá trị**: rực `#ff6b4a` ở chế độ tối (chữ trên coral là nâu sẫm `#2a0f07`), và sâu hơn `#c7361a` ở chế độ sáng (chữ trắng). Lý do: chữ coral cỡ nhỏ trên nền Paper rớt WCAG AA ở sắc rực, nên chế độ sáng dùng coral đủ sẫm để đạt AA; cả hai vẫn đọc ra coral nên thương hiệu không đổi. Mỗi màn tối đa một nút primary coral; không bôi coral làm nền mảng lớn.
- **Success (Mint `#34d399`):** **chỉ** dùng cho trạng thái "còn hiệu lực / VALID". Mint là accent trạng thái, tuyệt đối không dùng làm màu thương hiệu.
- **Secondary (Đỏ mận `#a93349`):** nhấn phụ và tag khuyến mãi thật. Không tranh chỗ với coral ở nhãn thường.
- **Tertiary (Cam đất `#9b4426`):** dành riêng cho trạng thái `WRONG_EVENT`. Không dùng làm màu trang trí ở nơi khác.
- **Kỷ luật coral:** vòng icon ở hàng cài đặt dùng nền trung tính (lớp Nổi) + icon xám, không phải coral. Badge "đã sử dụng" dùng xám trung tính. Coral dành cho điểm nhấn, không rải khắp — rải đều là thứ khiến bản tham chiếu trông như sinh tự động.

### Màu trạng thái (bắt buộc, ánh xạ thẳng từ spec)

Đây là hợp đồng giữa DESIGN.md và enum trong Prisma. Không sinh màu trạng thái ngoài bảng này.

| Trạng thái | Nguồn (spec) | Token | Nhãn tiếng Việt |
|---|---|---|---|
| `VALID` | CheckinLog | `success` | Hợp lệ |
| `ALREADY_USED` | CheckinLog | `warning` | Đã sử dụng |
| `INVALID` | CheckinLog | `error` | Không hợp lệ |
| `WRONG_EVENT` | CheckinLog | `tertiary` | Sai sự kiện |
| `PENDING` | Order | `warning` | Đang chờ thanh toán |
| `PAID` | Order | `success` | Đã thanh toán |
| `EXPIRED` | Order | `outline` | Hết hạn |
| `CANCELLED` | Order, Event | `error` | Đã huỷ |
| `DRAFT` | Event | `outline` | Nháp |
| `PUBLISHED` | Event | `primary` | Đang mở bán |
| `HIDDEN` | Event | `warning` | Bị ẩn |

**Không bao giờ truyền đạt trạng thái chỉ bằng màu.** `ALREADY_USED` (hổ phách) và `WRONG_EVENT` (cam đất) nằm gần nhau trên vòng màu và người mù màu deutan sẽ không phân biệt được. Mỗi trạng thái bắt buộc đi kèm **icon riêng + nhãn tiếng Việt**. Màu chỉ là lớp tăng tốc nhận biết cho người nhìn được, không phải kênh thông tin duy nhất.

### Dark mode

Bắt buộc, không phải tuỳ chọn: Scanner đứng trong hội trường tối cầm màn hình sáng trắng vừa loá mắt họ vừa loá mắt khách. Mặc định theo `prefers-color-scheme` / `Appearance` của hệ điều hành.

- Bảng `colorsDark` là bộ token song song hoàn chỉnh. Mọi component đọc token theo tên, không hardcode hex.
- Không dùng `#000000` thuần. Nền tối là Ink `#16141b` (mực ấm) để giữ chiều sâu.
- Mọi cặp nền/chữ ở cả hai chế độ đã kiểm và đạt WCAG AA sau khi đổi sang bảng Ember. Cặp thấp nhất: chế độ sáng **4.52:1** (`on-surface-variant` trên `surface-container-high`), chế độ tối **5.69:1**. Coral làm chữ đã được đẩy đủ sẫm ở chế độ sáng (`#c7361a`) để đạt AA, và ghép chữ trắng trên nền coral. Khi thêm token mới, kiểm tương phản trước khi commit.
- `outline-variant` là **role đường kẻ, không phải role chữ**. Nó nằm dưới ngưỡng 3:1 của UI phi văn bản — chấp nhận được vì WCAG miễn trừ đường phân cách thuần trang trí (hairline quanh thẻ, đường răng cưa), nhưng dùng nó cho chữ hay icon mang nghĩa là sai. Chữ dùng `on-surface-variant`; viền mang thông tin trạng thái thì dùng `outline` hoặc `primary`.
- **Ngoại lệ có chủ đích:** màn hình "Vé của tôi" luôn hiển thị mã QR trên nền trắng kể cả ở dark mode, kèm nâng độ sáng màn hình tối đa. Máy quét cần độ tương phản thật; QR trắng-trên-đen làm hỏng tỉ lệ đọc trên nhiều đầu đọc.

## Typography

Ba họ chữ, mỗi họ một vai trò:

- **Display / heading — Space Grotesk.** Giọng thương hiệu cho tiêu đề và wordmark. Space Grotesk phủ tiếng Việt (Google Fonts liệt kê dải Vietnamese và ký hiệu `₫`), nên an toàn cho tên sự kiện tiếng Việt.
- **Body — Be Vietnam Pro.** Chữ thân, dựng dấu tiếng Việt tốt mà không phá vỡ line-height.
- **Mã vé — JetBrains Mono.** Chỉ dành cho `code` vé, vì phải đọc và gõ tay khi máy quét hỏng. Tiền và bộ đếm KHÔNG dùng mono — chúng dùng `NumericText` (Be Vietnam Pro tabular-nums).

- **Scale:** tương phản cao giữa tiêu đề và body để quét nhanh thông tin sự kiện.
- **Readability:** body 16px làm mức nền, đủ cho mọi nhóm tuổi.
- **Số liệu:** style `numeric-lg` bật `tabular-nums`, dùng cho đồng hồ đếm ngược 15 phút, số tiền VND, và bộ đếm khách đã vào trên dashboard. Không có tabular-nums thì con số sẽ nhảy ngang mỗi giây khi đếm ngược.
- **Tiền tệ:** VND luôn là số nguyên, dấu chấm phân cách nghìn, không phần thập phân. Ký hiệu nằm trong file locale chứ không nằm trong code, vì nó đổi theo ngôn ngữ; bản tiếng Việt hiện là `1.250.000đ`.

## Layout & Spacing

Lưới linh hoạt, tối ưu cho tầm với ngón cái.

- **Thao tác một tay:** hành động chính nằm trong 60% dưới màn hình.
- **Whitespace:** padding 20px quanh container.
- **Nhịp:** thang 8px (8, 16, 24, 32, 40, 48).
- **Touch target:** tối thiểu 48px cho mọi phần tử bấm được (`touch-target-min`). Riêng CTA chính cao 52px (`cta-height`). Hai con số này khác nhau có chủ đích: 48px là sàn khả dụng, 52px là chiều cao thiết kế của nút chính.
- **Bottom nav:** 80px, cộng thêm safe-area inset của thiết bị.

## Elevation & Depth

Cách tiếp cận **flat-layered**, tránh bóng đổ nặng.

- **Shadows:** chỉ dùng cho phần tử nổi thật (FAB, thẻ vé). Bóng rất khuếch tán: `0px 4px 20px rgba(0, 0, 0, 0.04)`.
- **Dark mode không dùng bóng.** Bóng đen trên nền đen là vô hình. Ở dark mode, phân tầng bằng bậc `surface-container-*` (`surface` → `surface-container` → `surface-container-high`), đúng theo cách M3 làm.
- **Borders:** viền 1px bằng `outline-variant` để định hình mà không thêm sức nặng.
- **Thang z-index:** khai báo tập trung trong file hằng số, không rải `z-50` tuỳ tiện.
  1. Nội dung nền
  2. Thẻ và surface nổi
  3. Bottom nav
  4. Overlay và modal
  5. Kết quả quét toàn màn hình (nằm trên tất cả)

## Shapes

Thang bo góc có thứ bậc:

- **Thẻ:** 16px (`rounded-card`). Thumbnail sự kiện, container vé, khối hồ sơ.
- **Nút / input / chip nhỏ:** 12px (`rounded-ctl`). Nút không còn viên thuốc — bo 12 để có thứ bậc so với thẻ.
- **Badge trạng thái / chip:** viên thuốc (`rounded-full`).
- **Avatar:** tròn.

## Components

### Buttons
- **Primary:** nền coral, chữ `on-primary`, bo 12px (`rounded-ctl`). Không gradient. Mỗi màn tối đa một primary.
- **Secondary (outline):** viền coral mảnh, nền trong suốt.
- **Ghost:** chỉ chữ coral, không nền không viền.
- **Chiều cao:** 52px cho CTA chính trên mobile.
- **Trạng thái:** rest, hover (web), `:active` co lại `scale(0.98)`, disabled, và **loading**. Nút thanh toán và nút quét luôn cần trạng thái loading vì chúng chờ server.

### Cards (Thẻ sự kiện)
- Nền `surface-container-lowest`, bo 16px, viền 1px `outline-variant`.
- Ảnh trong thẻ bo góc 16px chỉ ở phía trên.
- Padding trong 16px.
- Thẻ sự kiện hiển thị chip trạng thái khi người xem là Organizer. Với Attendee thì không, vì họ chỉ thấy sự kiện `PUBLISHED` (AC-4) nên chip là thừa.

### Chips (Nhãn trạng thái)
- Font 12px, weight 500, nền là `*-container` của token trạng thái, chữ là `on-*-container` tương ứng.
- Luôn gồm icon + nhãn, không chỉ màu.
- Dùng cho cả phân loại (Âm nhạc, Nghệ thuật, Công nghệ) và trạng thái.

### Input Fields
- Viền 1px `outline`, không bóng khi nghỉ. Focus đổi sang viền 2px `primary`.
- **Label nằm trên input**, không dùng placeholder thay label.
- Helper text tuỳ chọn, error text nằm dưới input, màu `error`, kèm icon.
- Khoảng cách trong khối input: 8px.

### Lists
- Phân cách bằng đường 1px `outline-variant`.
- Icon dạng line-art bo tròn, đơn giản.
- Danh sách dài dùng phân trang hoặc lazy load, không đổ hết một lần.

### Navigation
- **Bottom bar:** icon lớn, nhãn 12px. Trạng thái đang chọn dùng màu `primary` và chấm chỉ báo dưới icon. Chấm này mang ý nghĩa thật (vị trí hiện tại), không phải trang trí — nó là kênh thứ hai bên cạnh màu.
- Tab của bottom bar khác nhau theo vai trò, theo đúng route group trong spec: `(attendee)` · `(organizer)` · `(scanner)`.
- **Từ 768px trở lên, thanh tab chuyển lên trên** (`tabBarPosition`), và nội dung giới hạn ở bề rộng đọc 800px, căn giữa. Một thanh dán đáy cửa sổ desktop 1440px là thói quen của điện thoại, không phải bố cục. Ngưỡng 768px trùng với breakpoint `md` để nav và màn hình đổi cùng lúc.

### Ticket QR (Vé của tôi)
Màn hình mà Attendee giơ ra trước máy quét. Thiết kế cho tốc độ đọc, không cho thẩm mỹ.

- Mã QR chiếm tối thiểu 280px vuông, luôn nền trắng, luôn có vùng đệm trắng quanh mã.
- Vào màn hình thì tự nâng độ sáng màn hình lên tối đa, rời màn hình thì trả về mức cũ.
- Dưới QR: tên sự kiện, hạng vé, thời gian, và `code` vé dạng văn bản để đọc thủ công khi máy quét hỏng.
- Chip trạng thái vé (Hợp lệ / Đã sử dụng / Đã huỷ) đặt ngay trên QR.
- Vé `USED` phủ lớp mờ lên QR kèm nhãn "Đã sử dụng" để nhân viên cửa thấy ngay, tránh quét lại vô ích.

### Scanner Result (Kết quả quét)
Bốn kết quả của `CheckinLog` hiển thị **toàn màn hình**, không phải toast. Nhân viên soát vé cầm máy ngang tầm hông trong đám đông và cần đọc kết quả trong khoảng một giây.

Mỗi kết quả gồm ba lớp phát tín hiệu cùng lúc:

| Kết quả | Màu nền | Icon | Nhãn | Haptic |
|---|---|---|---|---|
| `VALID` | `success-container` | dấu tick | Hợp lệ | success |
| `ALREADY_USED` | `warning-container` | đồng hồ quay lại | Đã sử dụng | warning |
| `INVALID` | `error-container` | dấu chéo | Không hợp lệ | error |
| `WRONG_EVENT` | `tertiary-container` | dấu chấm than trong hình thoi | Sai sự kiện | error |

- `ALREADY_USED` hiển thị thêm thời điểm đã quét lần trước, vì đó là câu đầu tiên khách sẽ hỏi.
- `WRONG_EVENT` hiển thị tên sự kiện mà vé thực sự thuộc về, để nhân viên chỉ đường cho khách.
- Màn hình kết quả tự đóng sau 2 giây và quay lại camera, có nút đóng thủ công.
- Nút đóng đặt trong tầm ngón cái, không ở góc trên.

### Checkout (VietQR + đếm ngược)
- Mã VietQR ở trên, ngay dưới là **số tiền** và **transferCode** dạng văn bản chọn được, mỗi cái có nút sao chép. Người dùng chuyển khoản thủ công vẫn cần hai giá trị này.
- Đồng hồ đếm ngược 15 phút dùng style `numeric-lg`. Dưới 2 phút thì đổi sang màu `warning`.
- Trạng thái đơn thăm dò bằng `GET /orders/:id` khi socket mất kết nối, và giao diện phải nói rõ đang chờ chứ không đứng im.
- Khi đơn `EXPIRED`: thay toàn khối QR bằng thông báo hết hạn và nút đặt lại. Không để mã QR chết nằm trên màn hình.

### Realtime Dashboard (Organizer)
- Bộ đếm khách đã vào dùng `numeric-lg` với tabular-nums, cập nhật qua Socket.IO (AC-13).
- Số liệu cập nhật thì chuyển tiếp mềm, không nháy. Nháy số ở dashboard đông người quét là gây nhiễu.
- Chỉ báo kết nối socket là trạng thái ngữ nghĩa thật, được phép hiển thị: đã kết nối, đang kết nối lại, mất kết nối. Khi mất kết nối phải nói rõ rằng số liệu có thể cũ.

## Trạng thái giao diện

Mỗi màn hình lấy dữ liệu phải thiết kế đủ bốn trạng thái, không chỉ trạng thái thành công.

- **Loading:** skeleton mô phỏng đúng hình dạng nội dung sắp hiện. Không dùng spinner tròn chung chung.
- **Empty:** có ý nghĩa và chỉ ra cách lấp đầy. "Chưa có vé nào" đi kèm nút dẫn tới danh sách sự kiện. "Chưa có sự kiện" của Organizer đi kèm nút tạo sự kiện.
- **Error:** đặt trong ngữ cảnh, kèm nút thử lại. Lỗi mạng khi quét vé phải nói rõ là **chưa** check-in, vì spec chọn online-only và nhân viên cần biết chắc.
- **Offline:** hệ thống không hỗ trợ check-in offline (nằm ngoài scope theo spec). Khi mất mạng, màn hình quét phải chặn rõ ràng chứ không được giả vờ hoạt động rồi thất bại âm thầm.

## Motion

Chuyển động ở mức thấp và luôn có lý do. Không animation trang trí.

- Chuyển cảnh điều hướng, phản hồi bấm nút (`scale(0.98)`), skeleton shimmer, chuyển tiếp số trên dashboard. Hết.
- Kết quả quét xuất hiện tức thì, không có animation vào. Độ trễ ở đây là lỗi, không phải sự tinh tế.
- Tôn trọng `prefers-reduced-motion`: mọi chuyển động thu về trạng thái tĩnh.

## Quyết định kỹ thuật đã cân nhắc

Ghi lại để không ai phải tra lại, và để biết khi nào nên xét lại.

**Token đi qua CSS variable, không qua tiền tố `dark:`.** `app/src/design/tokens.ts` là file duy nhất trong repo chứa mã màu. Nó nuôi `vars()` ở root layout, `tailwind.config.js` (chỉ chứa tên biến, không chứa hex), và các API cần màu thô. Nhờ vậy `className="bg-surface"` tự đúng ở cả hai chế độ và **không class màu nào cần `dark:`**. Lưu ý: NativeWind giải biến qua React context chứ không phải cascade CSS thật, nên `@media (prefers-color-scheme)` trong file CSS **không** đổi được biến trên native, và mọi thứ render ngoài `<View>` bọc `vars()` (ví dụ portal) sẽ không thấy theme.

**Không dùng `expo-router/unstable-native-tabs`.** Doc Expo ghi rõ nó đang alpha, "API is subject to change", và trên web nó rơi về "a basic implementation, loosely based on iPad design". AC-19 đặt web ngang hàng với app, nên đổi web lấy native feel là giá sai. Xét lại khi native tabs rời alpha **và** có đường ra tử tế cho web.

**Chưa dùng FlashList.** Danh sách hiện chỉ vài sự kiện; `FlatList` là đủ và không có gì để đo. Đổi khi `GET /api/events` có phân trang thật (AC-4).

**React Compiler đang bật** (`app.json` → `experiments.reactCompiler`). Nó tự memo hoá, nên **đừng rải `memo`/`useCallback` bằng tay** cho có; chỉ thêm khi đo được một vấn đề cụ thể.

**Ngày và số đi qua `Intl`, không tự nối chuỗi.** `src/lib/format.ts` nhận `locale` ở mọi hàm và người dùng đổi được ngôn ngữ lúc chạy (`language-store.ts`). Định dạng cứng theo kiểu Việt là **bug, không phải chuyện thẩm mỹ**: `200.000` là hai trăm nghìn trong `vi` nhưng là *hai trăm* trong `en`, nên người dùng tiếng Anh đọc sai giá. Ngày dùng tháng viết chữ (`15 thg 8` / `Aug 15`) vì dạng số cho `vi` ra `15-08` (không ai viết thế) và `en` ra `08/15` (phần còn lại của thế giới đọc thành ngày 8). Dùng option thành phần chứ **không dùng `dateStyle`/`timeStyle`**: Hermes trên Android chống lưng `Intl` bằng bản Java, và nhóm shorthand đó là phần kém đầy đủ nhất. `Intl` an toàn trên mọi nền: React Native build Hermes với `HERMES_ENABLE_INTL`.

**Ký hiệu tiền thuộc về locale, không thuộc về hàm format.** `formatVndAmount` chỉ nhóm chữ số; `vi.ts` gắn `đ`, `en.ts` gắn `₫`. Hai ký hiệu khác nhau là cố ý: `đ` là cái người Việt viết hằng ngày, `₫` là ký hiệu VND quốc tế mà người đọc tiếng Anh nhận ra.

**Web export có shell HTML riêng** (`src/app/+html.tsx`). Nó chạy lúc build nên không có hook, không có context. Ở đó khai báo `color-scheme: light dark` để trình duyệt vẽ thanh cuộn, con trỏ nhập và control native theo đúng chế độ (thiếu nó thì chúng vẫn sáng trên nền tối), cùng `theme-color` cho hai chế độ. Màu import từ `design/tokens.ts` để file này không trở thành nơi thứ hai chép lại bảng màu.

## Accessibility

- Tương phản đạt WCAG AA ở cả hai chế độ sáng và tối.
- Không dùng màu làm kênh thông tin duy nhất (xem lại phần Màu trạng thái). Điều này áp cả cho nav: tab đang chọn có thêm **pill nền sau icon**, vì nếu chỉ đổi màu thì người không phân biệt được coral với xám sẽ không biết mình đang ở đâu.
- **Chỉ báo tab phải ôm icon bằng padding, không được đặt kích thước cứng.** Đã hỏng hai lần theo cùng một kiểu. Đầu tiên là chấm dưới icon: nó buộc phải `absolute` để khỏi làm cao thêm hộp icon, và thế là rơi trúng nhãn — ở 390px chấm coral nằm gọn trong chữ "m" của "Khám phá". Rồi đến pill `w-16`: nhãn nằm *dưới* icon ở khổ điện thoại nhưng nằm *cạnh* icon khi tab chuyển lên trên, mà navigator chỉ chừa ~8px giữa hai thứ, nên pill rộng 64px trườn vào nhãn 11.5px. Bài học chung: nav này đổi hướng theo breakpoint, nên mọi số đo cứng canh cho một hướng sẽ sai ở hướng kia. Đo pill so với nhãn ở **cả hai** khổ trước khi tin là xong.
- Touch target tối thiểu 48px. Phần tử vẽ nhỏ hơn (ví dụ nút tăng/giảm số vé, 36px) phải bù bằng `hitSlop` cho đủ 48px.
- **Toàn bộ nhãn giao diện đến từ file locale, không hardcode trong code.** App ship hai ngôn ngữ `vi` và `en` (xem CLAUDE.md); một chuỗi tiếng Việt nhét thẳng vào component là chuỗi mà người dùng tiếng Anh vẫn nhận được bằng tiếng Việt. Quy tắc này áp cho cả nhãn dành cho trình đọc màn hình.
- Camera quét vé cần đường thoát cho người không dùng được camera: nhập `code` vé thủ công.
