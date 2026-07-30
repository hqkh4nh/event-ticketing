import { ConflictException } from '@nestjs/common';

import { ErrorCode } from '../../common/errors/error-code';
import {
  assertTicketQuantityNotBelowReserved,
  assertTransition,
} from './events-organizer.service';

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

describe('assertTicketQuantityNotBelowReserved', () => {
  it('allows a total equal to or greater than the reserved quantity', () => {
    expect(() => assertTicketQuantityNotBelowReserved(12, 12)).not.toThrow();
    expect(() => assertTicketQuantityNotBelowReserved(20, 12)).not.toThrow();
  });

  it('rejects a total lower than the reserved quantity', () => {
    expect(() => assertTicketQuantityNotBelowReserved(11, 12)).toThrow(
      ConflictException,
    );

    try {
      assertTicketQuantityNotBelowReserved(11, 12);
    } catch (error) {
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: ErrorCode.TICKET_QUANTITY_BELOW_RESERVED,
      });
    }
  });
});
