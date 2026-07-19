import { ConfigService } from '@nestjs/config';

import { TicketSignerService } from './ticket-signer.service';

function makeSigner(
  secret = 'unit-test-ticket-hmac-secret-1234',
): TicketSignerService {
  const config = {
    getOrThrow: (key: string) => {
      if (key === 'ticket.hmacSecret') return secret;
      throw new Error(`unexpected config key ${key}`);
    },
  } as unknown as ConfigService;
  return new TicketSignerService(config);
}

describe('TicketSignerService', () => {
  it('verifies the signature it produced for a code', () => {
    const signer = makeSigner();
    const code = signer.newCode();
    const signature = signer.sign(code);

    expect(signer.verify(code, signature)).toBe(true);
  });

  it('rejects a signature when a single character of the code changes', () => {
    const signer = makeSigner();
    const code = 'TK_abcdef0123456789';
    const signature = signer.sign(code);
    const tampered = `${code.slice(0, -1)}${code.at(-1) === 'x' ? 'y' : 'x'}`;

    expect(signer.verify(tampered, signature)).toBe(false);
  });

  it('produces different signatures under different secrets', () => {
    const code = 'TK_same_code_value';

    expect(makeSigner('secret-aaaaaaaaaaaaaaaa').sign(code)).not.toBe(
      makeSigner('secret-bbbbbbbbbbbbbbbb').sign(code),
    );
  });

  it('mints unique, URL-safe codes', () => {
    const signer = makeSigner();
    const codes = new Set(Array.from({ length: 1000 }, () => signer.newCode()));

    expect(codes.size).toBe(1000);
    for (const code of codes) {
      expect(code).toMatch(/^TK_[A-Za-z0-9_-]+$/);
    }
  });
});
