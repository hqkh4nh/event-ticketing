import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { PinoLogger } from 'nestjs-pino';

export type MailAttachment = {
  filename: string;
  content: Buffer;
  cid: string;
};

export type MailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: MailAttachment[];
};

/**
 * The only place that talks to an SMTP server. Sending is best effort: `send`
 * never throws, so a dead mail server can never roll back or fail the work that
 * triggered the message.
 */
@Injectable()
export class MailService {
  /** False means no transport exists and `send` is a no-op. */
  readonly isEnabled: boolean;

  private readonly transport: Transporter | null;
  private readonly from: string;

  constructor(
    config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(MailService.name);

    const host = config.get<string>('mail.host') ?? '';
    // e2e boots the real AppModule and ConfigModule reads the developer's own
    // .env, so a machine with working SMTP would otherwise send real mail on
    // every test run. Jest sets NODE_ENV=test and dotenv does not overwrite an
    // existing process.env value, which makes this check reliable.
    const isTest = config.get<string>('nodeEnv') === 'test';

    this.isEnabled = host !== '' && !isTest;
    this.from = config.get<string>('mail.from') ?? '';

    if (!this.isEnabled) {
      this.transport = null;
      this.logger.info(
        { reason: isTest ? 'test environment' : 'SMTP_HOST is empty' },
        'Email sending is disabled',
      );
      return;
    }

    this.transport = createTransport({
      host,
      port: config.get<number>('mail.port'),
      // Mismatching port and secure hangs the connection until timeout rather
      // than reporting an error, so this comes from config, never inference.
      secure: config.get<boolean>('mail.secure'),
      auth: {
        user: config.get<string>('mail.user') ?? '',
        pass: config.get<string>('mail.pass') ?? '',
      },
    });
    this.logger.info({ host }, 'Email sending is enabled');
  }

  async send(message: MailMessage): Promise<void> {
    if (!this.transport) return;

    try {
      await this.transport.sendMail({ from: this.from, ...message });
    } catch (error) {
      this.logger.error(
        { err: error, to: message.to, subject: message.subject },
        'Failed to send an email',
      );
    }
  }
}
