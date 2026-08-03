import { ConflictException } from '@nestjs/common';

import { ErrorCode } from '../../common/errors/error-code';
import * as adminServiceModule from '../admin/admin.service';
import {
  assertTicketQuantityNotBelowReserved,
  assertTransition,
  EventsOrganizerService,
} from './events-organizer.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('assertTransition', () => {
  it('allows an organizer to submit a draft for review', () => {
    expect(() => assertTransition('DRAFT', 'PENDING_REVIEW')).not.toThrow();
  });

  it('rejects publishing a draft without admin approval', () => {
    expect(() => assertTransition('DRAFT', 'PUBLISHED')).toThrow(
      ConflictException,
    );
  });

  it.each([
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

describe('admin event approval transition', () => {
  it('only accepts events waiting for review', () => {
    const assertAdminApprovalTransition = (
      adminServiceModule as unknown as {
        assertAdminApprovalTransition?: (status: string) => void;
      }
    ).assertAdminApprovalTransition;

    expect(assertAdminApprovalTransition).toBeDefined();
    expect(() =>
      assertAdminApprovalTransition?.('PENDING_REVIEW'),
    ).not.toThrow();
    expect(() => assertAdminApprovalTransition?.('DRAFT')).toThrow(
      ConflictException,
    );
  });
});

describe('organizer publication review', () => {
  it('moves a draft to review and notifies every active admin', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 2 });
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      event: {
        findFirst: jest.fn().mockResolvedValue({
          title: 'Summer Night',
          status: 'DRAFT',
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      ticketType: { count: jest.fn().mockResolvedValue(1) },
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'admin-1' }, { id: 'admin-2' }]),
      },
      notification: { createMany },
    };
    const prisma = {
      $transaction: jest.fn(
        (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new EventsOrganizerService(prisma);
    jest
      .spyOn(
        service as unknown as {
          toDetail: (id: string, organizerId: string) => Promise<unknown>;
        },
        'toDetail',
      )
      .mockResolvedValue({});

    await service.publish('organizer-1', 'event-1');

    expect(tx.event.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'event-1',
        organizerId: 'organizer-1',
        status: 'DRAFT',
      },
      data: { status: 'PENDING_REVIEW' },
    });
    expect(createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'admin-1',
          type: 'EVENT_SUBMITTED',
        }),
        expect.objectContaining({
          userId: 'admin-2',
          type: 'EVENT_SUBMITTED',
        }),
      ]),
    });
  });
});
