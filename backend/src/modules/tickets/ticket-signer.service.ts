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
    /*
     * HMAC kết hợp code công khai với secret chỉ server biết. Người dùng có thể
     * đọc/sửa code trong QR nhưng không thể tạo signature mới hợp lệ nếu không
     * biết secret. HMAC xác thực tính toàn vẹn, không mã hóa nội dung code.
     */
    return createHmac('sha256', this.secret).update(code).digest('base64url');
  }

  /**
   * The exact string a QR encodes. Both the app's ticket list and the ticket
   * email build their QR from this, so the format cannot drift between them.
   */
  qrPayload(code: string, signature: string): string {
    return `${code}.${signature}`;
  }

  verify(code: string, signature: string): boolean {
    const expected = Buffer.from(this.sign(code));
    const actual = Buffer.from(signature);
    /*
     * timingSafeEqual giảm rò rỉ qua thời gian so sánh so với so chuỗi tuần tự.
     * Node ném lỗi nếu hai Buffer khác độ dài, nên phải guard length trước.
     */
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }
}
