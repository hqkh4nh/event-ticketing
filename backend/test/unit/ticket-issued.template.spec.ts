import {
  INLINE_QR_LIMIT,
  buildTicketIssuedEmail,
  type TicketEmailData,
} from '../../src/modules/mail/templates/ticket-issued.template';

// Real PNG rendering costs ~2s per call under Jest; qr-image.spec.ts covers it
// for real. What matters here is the copy, the cid wiring and the inline cap.
jest.mock('../../src/modules/mail/qr-image', () => ({
  renderQrPng: (payload: string) => Promise.resolve(Buffer.from(payload)),
}));

function makeData(ticketCount: number): TicketEmailData {
  return {
    recipientName: 'Huỳnh Quốc Khánh',
    eventTitle: 'Summer Music Festival 2026',
    eventVenue: 'My Dinh National Stadium',
    eventStartAt: new Date('2026-08-15T12:00:00.000Z'),
    tickets: Array.from({ length: ticketCount }, (_, index) => ({
      ticketTypeName: 'General Admission',
      code: `TK_code${index + 1}`,
      qrPayload: `TK_code${index + 1}.signature${index + 1}`,
    })),
  };
}

describe('buildTicketIssuedEmail', () => {
  it('writes Vietnamese copy for a VI recipient', async () => {
    const email = await buildTicketIssuedEmail(makeData(1), 'VI');

    expect(email.subject).toBe('Vé của bạn - Summer Music Festival 2026');
    expect(email.html).toContain('Chào Huỳnh Quốc Khánh,');
    expect(email.html).toContain('Mã vé');
    expect(email.text).toContain('TK_code1');
  });

  it('writes English copy for an EN recipient', async () => {
    const email = await buildTicketIssuedEmail(makeData(1), 'EN');

    expect(email.subject).toBe('Your tickets - Summer Music Festival 2026');
    expect(email.html).toContain('Hi Huỳnh Quốc Khánh,');
    expect(email.html).toContain('Ticket code');
    expect(email.html).not.toContain('Mã vé');
  });

  it('embeds one inline QR per ticket, referenced by its own cid', async () => {
    const email = await buildTicketIssuedEmail(makeData(3), 'VI');

    expect(email.attachments).toHaveLength(3);
    for (const attachment of email.attachments) {
      expect(attachment.content.length).toBeGreaterThan(0);
      expect(email.html).toContain(`cid:${attachment.cid}`);
    }
    // Distinct payloads must not collapse onto one cid.
    expect(new Set(email.attachments.map((a) => a.cid)).size).toBe(3);
  });

  it('caps inline QR codes and lists the rest as text', async () => {
    const email = await buildTicketIssuedEmail(makeData(12), 'VI');

    expect(INLINE_QR_LIMIT).toBe(10);
    expect(email.attachments).toHaveLength(10);
    expect(email.html).toContain('Còn 2 vé nữa');
    // The two tickets past the cap still reach the reader as text.
    expect(email.html).toContain('TK_code11');
    expect(email.html).toContain('TK_code12');
  });

  it('renders a plain-text alternative carrying every ticket code', async () => {
    const email = await buildTicketIssuedEmail(makeData(12), 'VI');

    expect(email.text).not.toContain('<');
    for (let index = 1; index <= 12; index += 1) {
      expect(email.text).toContain(`TK_code${index}`);
    }
  });

  it('escapes HTML in values that come from user input', async () => {
    const data = makeData(1);
    data.eventTitle = 'Rock & <script>alert(1)</script>';

    const email = await buildTicketIssuedEmail(data, 'VI');

    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });
});
