import { ConflictException } from '@nestjs/common';

import { ErrorCode } from '../../common/errors/error-code';
import { assertTransition } from './events-organizer.service';

describe('assertTransition', () => {
  it.each([
    ['DRAFT', 'PUBLISHED'],
    ['PUBLISHED', 'DRAFT'],
    ['PUBLISHED', 'CANCELLED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(() => assertTransition(from, to)).not.toThrow();
  });

  it.each([
    ['DRAFT', 'CANCELLED'],
    ['CANCELLED', 'PUBLISHED'],
    ['PUBLISHED', 'HIDDEN'],
    ['DRAFT', 'DRAFT'],
  ] as const)('rejects %s -> %s', (from, to) => {
    expect(() => assertTransition(from, to)).toThrow(ConflictException);
    try {
      assertTransition(from, to);
    } catch (error) {
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: ErrorCode.INVALID_STATE_TRANSITION,
      });
    }
  });
});
