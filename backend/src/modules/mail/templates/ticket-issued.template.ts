import { en } from '../locales/en';
import { vi } from '../locales/vi';
import { renderQrPng } from '../qr-image';

import type { Locale } from '../../../generated/prisma';
import type { EmailStrings } from '../locales/vi';

/**
 * How many QR images ride along in the message body. An order has no upper
 * bound on quantity, and a mail with hundreds of PNGs is clipped by Gmail or
 * rejected outright for size, so the tail is listed as text instead.
 */
export const INLINE_QR_LIMIT = 10;

export type TicketEmailTicket = {
  ticketTypeName: string;
  code: string;
  qrPayload: string;
};

export type TicketEmailData = {
  recipientName: string;
  eventTitle: string;
  eventVenue: string;
  eventStartAt: Date;
  tickets: TicketEmailTicket[];
};

export type TicketEmailAttachment = {
  filename: string;
  content: Buffer;
  cid: string;
};

export type BuiltEmail = {
  subject: string;
  html: string;
  text: string;
  attachments: TicketEmailAttachment[];
};

const MONO_STACK = "'JetBrains Mono', Consolas, 'Courier New', monospace";
const SANS_STACK = "'Helvetica Neue', Helvetica, Arial, sans-serif";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Events are held in Vietnam, so the reader wants venue time regardless of
 * where the server runs or which language they read.
 */
function formatStartAt(startAt: Date, dateLocale: string): string {
  return new Intl.DateTimeFormat(dateLocale, {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  }).format(startAt);
}

function ticketBlock(
  ticket: TicketEmailTicket,
  index: number,
  total: number,
  cid: string,
  strings: EmailStrings,
): string {
  return `
        <tr>
          <td style="padding:16px 0;border-top:1px solid #e5e0d8;">
            <p style="margin:0 0 4px;font-family:${SANS_STACK};font-size:13px;color:#7a7268;">
              ${escapeHtml(strings.ticketHeading(index, total))} &middot; ${escapeHtml(ticket.ticketTypeName)}
            </p>
            <img src="cid:${cid}" width="220" height="220" alt=""
              style="display:block;width:220px;height:220px;background:#ffffff;border:8px solid #ffffff;border-radius:4px;" />
            <p style="margin:8px 0 0;font-family:${SANS_STACK};font-size:12px;color:#7a7268;">
              ${escapeHtml(strings.codeLabel)}
            </p>
            <p style="margin:2px 0 0;font-family:${MONO_STACK};font-size:14px;color:#241f1a;letter-spacing:0.5px;">
              ${escapeHtml(ticket.code)}
            </p>
          </td>
        </tr>`;
}

function remainingBlock(
  tickets: TicketEmailTicket[],
  strings: EmailStrings,
): string {
  const codes = tickets
    .map(
      (ticket) =>
        `<p style="margin:2px 0;font-family:${MONO_STACK};font-size:13px;color:#241f1a;">${escapeHtml(ticket.code)}</p>`,
    )
    .join('');

  return `
        <tr>
          <td style="padding:16px 0;border-top:1px solid #e5e0d8;">
            <p style="margin:0 0 6px;font-family:${SANS_STACK};font-size:14px;font-weight:bold;color:#241f1a;">
              ${escapeHtml(strings.remainingHeading(tickets.length))}
            </p>
            ${codes}
            <p style="margin:8px 0 0;font-family:${SANS_STACK};font-size:13px;color:#7a7268;">
              ${escapeHtml(strings.remainingHint)}
            </p>
          </td>
        </tr>`;
}

function buildText(
  data: TicketEmailData,
  strings: EmailStrings,
  startAt: string,
): string {
  const lines = [
    strings.greeting(data.recipientName),
    '',
    strings.intro(data.tickets.length),
    '',
    data.eventTitle,
    data.eventVenue,
    startAt,
    '',
  ];

  data.tickets.forEach((ticket, index) => {
    lines.push(
      `${strings.ticketHeading(index + 1, data.tickets.length)} - ${ticket.ticketTypeName}`,
      `${strings.codeLabel}: ${ticket.code}`,
      '',
    );
  });

  lines.push(strings.remainingHint, '', strings.footer);
  return lines.join('\n');
}

/**
 * Builds the ticket email. Layout is table-based with inline CSS and a 600px
 * cap because Outlook renders through Word: no flexbox, no grid, no stylesheet.
 */
export async function buildTicketIssuedEmail(
  data: TicketEmailData,
  locale: Locale,
): Promise<BuiltEmail> {
  const strings = locale === 'EN' ? en : vi;
  const total = data.tickets.length;
  const inline = data.tickets.slice(0, INLINE_QR_LIMIT);
  const remaining = data.tickets.slice(INLINE_QR_LIMIT);
  const startAt = formatStartAt(data.eventStartAt, strings.dateLocale);

  const attachments = await Promise.all(
    inline.map(async (ticket, index) => ({
      filename: `ticket-${index + 1}.png`,
      content: await renderQrPng(ticket.qrPayload),
      cid: `ticket-${index + 1}@eticket`,
    })),
  );

  const ticketRows = inline
    .map((ticket, index) =>
      ticketBlock(ticket, index + 1, total, attachments[index].cid, strings),
    )
    .join('');

  const html = `<!doctype html>
<html lang="${locale.toLowerCase()}">
<body style="margin:0;padding:0;background:#f6f2ec;">
  <div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(strings.preheader(total))}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ec;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0"
          style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;">
          <tr>
            <td style="padding:24px 24px 0;">
              <p style="margin:0;font-family:${SANS_STACK};font-size:20px;font-weight:bold;color:#c2410c;">eTicket</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 0;">
              <p style="margin:0 0 12px;font-family:${SANS_STACK};font-size:15px;color:#241f1a;">
                ${escapeHtml(strings.greeting(data.recipientName))}
              </p>
              <p style="margin:0;font-family:${SANS_STACK};font-size:15px;color:#241f1a;">
                ${escapeHtml(strings.intro(total))}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 24px 0;">
              <p style="margin:0;font-family:${SANS_STACK};font-size:18px;font-weight:bold;color:#241f1a;">
                ${escapeHtml(data.eventTitle)}
              </p>
              <p style="margin:4px 0 0;font-family:${SANS_STACK};font-size:14px;color:#7a7268;">
                ${escapeHtml(data.eventVenue)}
              </p>
              <p style="margin:2px 0 0;font-family:${SANS_STACK};font-size:14px;color:#7a7268;">
                ${escapeHtml(startAt)}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 24px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${ticketRows}${
                remaining.length ? remainingBlock(remaining, strings) : ''
              }
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;">
              <p style="margin:0;font-family:${SANS_STACK};font-size:12px;color:#a29a8f;">
                ${escapeHtml(strings.footer)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: strings.subject(data.eventTitle),
    html,
    text: buildText(data, strings, startAt),
    attachments,
  };
}
