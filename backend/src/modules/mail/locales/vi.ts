/**
 * Vietnamese copy for outgoing email. This is the value side of a translation
 * file, the one place the server is allowed to hold user-facing prose.
 */
export const vi = {
  dateLocale: 'vi-VN',
  subject: (eventTitle: string) => `Vé của bạn - ${eventTitle}`,
  preheader: (count: number) =>
    count === 1
      ? 'Vé của bạn đã sẵn sàng.'
      : `${count} vé của bạn đã sẵn sàng.`,
  greeting: (name: string) => `Chào ${name},`,
  intro: (count: number) =>
    count === 1
      ? 'Vé của bạn đã được phát hành. Đưa mã QR bên dưới cho nhân viên soát vé tại cổng.'
      : `${count} vé của bạn đã được phát hành. Đưa các mã QR bên dưới cho nhân viên soát vé tại cổng.`,
  ticketHeading: (index: number, total: number) => `Vé ${index}/${total}`,
  codeLabel: 'Mã vé',
  remainingHeading: (count: number) => `Còn ${count} vé nữa`,
  remainingHint:
    'Mở ứng dụng eTicket để xem mã QR của những vé còn lại trong đơn này.',
  footer: 'Email này được gửi tự động, vui lòng không trả lời.',
};

export type EmailStrings = typeof vi;
