import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Signs and verifies ticket QR payloads. The QR carries `code.signature` where
 * `signature = HMAC-SHA256(server_secret, code)`, so a scanner can reject a
 * forged code without a database round trip. The "used" state still lives in
 * the database and is never trusted from the QR.
 */
@Injectable()
export class TicketSignerService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    this.secret = config.getOrThrow<string>('ticket.hmacSecret');
  }

  /** A unique, unguessable, URL-safe ticket code. */
  newCode(): string {
    return `TK_${randomBytes(16).toString('base64url')}`;
  }

  sign(code: string): string {
    return createHmac('sha256', this.secret).update(code).digest('base64url');
  }

  verify(code: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(code));
    const actual = Buffer.from(signature);
    // timingSafeEqual throws on length mismatch, so guard it first.
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}
