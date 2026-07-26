import { PinoLogger } from 'nestjs-pino';

import { PrismaService } from '../../prisma/prisma.service';
import { TicketSignerService } from '../tickets/ticket-signer.service';
import { MailService, type MailMessage } from './mail.service';
import { TicketEmailService } from './ticket-email.service';

// Real PNG rendering costs ~2s per call under Jest; qr-image.spec.ts covers it.
jest.mock('./qr-image', () => ({
  renderQrPng: (payload: string) => Promise.resolve(Buffer.from(payload)),
}));

type OrderRow = {
  buyer: { email: string | null; fullName: string; locale: 'VI' | 'EN' };
  event: { title: string; venue: string; startAt: Date };
  items: {
    ticketType: { name: string };
    tickets: { code: string; signature: string }[];
  }[];
};

function makeOrder(overrides: Partial<OrderRow> = {}): OrderRow {
  return {
    buyer: {
      email: 'buyer@example.com',
      fullName: 'Huỳnh Quốc Khánh',
      locale: 'VI',
    },
    event: {
      title: 'Summer Music Festival 2026',
      venue: 'My Dinh National Stadium',
      startAt: new Date('2026-08-15T12:00:00.000Z'),
    },
    items: [
      {
        ticketType: { name: 'General Admission' },
        tickets: [
          { code: 'TK_one', signature: 'sig1' },
          { code: 'TK_two', signature: 'sig2' },
        ],
      },
    ],
    ...overrides,
  };
}

function makeService(options: {
  isEnabled?: boolean;
  order?: OrderRow | null;
  findUnique?: jest.Mock;
}) {
  const findUnique =
    options.findUnique ??
    jest.fn().mockResolvedValue(options.order ?? makeOrder());
  const prisma = { order: { findUnique } } as unknown as PrismaService;

  const send = jest.fn().mockResolvedValue(undefined);
  const mail = {
    isEnabled: options.isEnabled ?? true,
    send,
  } as unknown as MailService;

  const signer = {
    qrPayload: (code: string, signature: string) => `${code}.${signature}`,
  } as unknown as TicketSignerService;

  const error = jest.fn();
  const logger = { setContext: jest.fn(), error } as unknown as PinoLogger;

  return {
    service: new TicketEmailService(prisma, mail, signer, logger),
    send,
    findUnique,
    error,
  };
}

describe('TicketEmailService', () => {
  it('mails the buyer one message carrying every ticket', async () => {
    const { service, send } = makeService({});

    await service.sendTicketsIssued('order-1');

    expect(send).toHaveBeenCalledTimes(1);
    const message = send.mock.calls[0][0] as MailMessage;
    expect(message.to).toBe('buyer@example.com');
    expect(message.attachments).toHaveLength(2);
    expect(message.text).toContain('TK_one');
    expect(message.text).toContain('TK_two');
  });

  it('encodes the exact payload the app shows in the QR', async () => {
    const { service, send } = makeService({});

    await service.sendTicketsIssued('order-1');

    const message = send.mock.calls[0][0] as MailMessage;
    // renderQrPng is stubbed to echo its input, so the attachment bytes are
    // the payload that would have been encoded.
    expect(message.attachments?.[0].content.toString()).toBe('TK_one.sig1');
    expect(message.attachments?.[1].content.toString()).toBe('TK_two.sig2');
  });

  it("writes the message in the buyer's stored language", async () => {
    const order = makeOrder();
    order.buyer.locale = 'EN';
    const { service, send } = makeService({ order });

    await service.sendTicketsIssued('order-1');

    const message = send.mock.calls[0][0] as MailMessage;
    expect(message.subject).toBe('Your tickets - Summer Music Festival 2026');
  });

  it('does not touch the database when mail is disabled', async () => {
    const { service, send, findUnique } = makeService({ isEnabled: false });

    await service.sendTicketsIssued('order-1');

    expect(findUnique).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing for a buyer without an email address', async () => {
    const order = makeOrder();
    order.buyer.email = null;
    const { service, send } = makeService({ order });

    await service.sendTicketsIssued('order-1');

    expect(send).not.toHaveBeenCalled();
  });

  it('sends nothing when the order has no tickets', async () => {
    const { service, send } = makeService({ order: makeOrder({ items: [] }) });

    await service.sendTicketsIssued('order-1');

    expect(send).not.toHaveBeenCalled();
  });

  it('logs and swallows a failure instead of throwing at the caller', async () => {
    const { service, error } = makeService({
      findUnique: jest.fn().mockRejectedValue(new Error('database is down')),
    });

    await expect(service.sendTicketsIssued('order-1')).resolves.toBeUndefined();
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('never rejects out of the fire-and-forget entry point', async () => {
    const { service } = makeService({});
    jest
      .spyOn(service, 'sendTicketsIssued')
      .mockRejectedValue(new Error('unexpected'));

    expect(() => service.queueTicketsIssued('order-1')).not.toThrow();
    // Let the rejection settle; an unhandled one would fail this test run.
    await new Promise((resolve) => setImmediate(resolve));
  });
});
