import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';

import {
  MailService,
  type MailMessage,
} from '../../src/modules/mail/mail.service';

const sendMail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: (...args: unknown[]) => sendMail(...args),
  })),
}));

import { createTransport } from 'nodemailer';

const values = {
  host: 'smtp.resend.com',
  port: 465,
  secure: true,
  user: 'resend',
  pass: 're_test_key',
  from: 'eTicket <no-reply@eticket.example>',
  nodeEnv: 'development',
};

function makeService(overrides: Partial<typeof values> = {}): MailService {
  const settings = { ...values, ...overrides };
  const config = {
    get: (key: string) =>
      ({
        'mail.host': settings.host,
        'mail.port': settings.port,
        'mail.secure': settings.secure,
        'mail.user': settings.user,
        'mail.pass': settings.pass,
        'mail.from': settings.from,
        nodeEnv: settings.nodeEnv,
      })[key],
  } as unknown as ConfigService;

  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;

  return new MailService(config, logger);
}

const message: MailMessage = {
  to: 'buyer@example.com',
  subject: 'Your tickets',
  html: '<p>hi</p>',
  text: 'hi',
};

describe('MailService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds a transport when SMTP is configured', async () => {
    const service = makeService();

    expect(service.isEnabled).toBe(true);
    expect(createTransport).toHaveBeenCalledTimes(1);

    sendMail.mockResolvedValueOnce({});
    await service.send(message);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'buyer@example.com', from: values.from }),
    );
  });

  it('stays off when SMTP_HOST is empty', async () => {
    const service = makeService({ host: '' });

    expect(service.isEnabled).toBe(false);
    expect(createTransport).not.toHaveBeenCalled();

    await service.send(message);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('stays off under NODE_ENV=test even with a real host configured', async () => {
    const service = makeService({ nodeEnv: 'test' });

    expect(service.isEnabled).toBe(false);
    expect(createTransport).not.toHaveBeenCalled();

    await service.send(message);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('swallows a transport failure instead of throwing at the caller', async () => {
    const service = makeService();
    sendMail.mockRejectedValueOnce(new Error('connection refused'));

    await expect(service.send(message)).resolves.toBeUndefined();
  });
});
