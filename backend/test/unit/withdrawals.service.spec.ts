import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';

import { ErrorCode } from '../../src/common/errors/error-code';
import { PrismaService } from '../../src/prisma/prisma.service';
import {
  assertWithdrawalTransition,
  WithdrawalsService,
} from '../../src/modules/withdrawals/withdrawals.service';

describe('assertWithdrawalTransition', () => {
  it.each([
    ['PENDING', 'APPROVED'],
    ['PENDING', 'REJECTED'],
    ['PENDING', 'CANCELLED'],
    ['APPROVED', 'PAID'],
    ['APPROVED', 'REJECTED'],
  ] as const)('allows %s -> %s', (from, to) => {
    expect(() => assertWithdrawalTransition(from, to)).not.toThrow();
  });

  it.each([
    ['PENDING', 'PAID'],
    ['APPROVED', 'CANCELLED'],
    ['PAID', 'REJECTED'],
    ['REJECTED', 'APPROVED'],
    ['CANCELLED', 'PENDING'],
    ['PENDING', 'PENDING'],
  ] as const)('rejects %s -> %s', (from, to) => {
    expect(() => assertWithdrawalTransition(from, to)).toThrow(
      ConflictException,
    );
    try {
      assertWithdrawalTransition(from, to);
    } catch (error) {
      expect((error as ConflictException).getResponse()).toMatchObject({
        code: ErrorCode.INVALID_STATE_TRANSITION,
      });
    }
  });
});

type BalanceFixture = {
  settledRevenueVnd: bigint;
  openVnd: bigint;
  paidVnd: bigint;
};

function buildService(fixture: BalanceFixture, openRequests = 0) {
  const aggregate = jest
    .fn()
    .mockResolvedValueOnce({ _sum: { amountVnd: fixture.openVnd } })
    .mockResolvedValueOnce({ _sum: { amountVnd: fixture.paidVnd } });

  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    order: {
      aggregate: jest
        .fn()
        .mockResolvedValue({ _sum: { totalVnd: fixture.settledRevenueVnd } }),
    },
    withdrawalRequest: {
      count: jest.fn().mockResolvedValue(openRequests),
      aggregate,
      create: jest.fn().mockResolvedValue(withdrawalRow()),
    },
    user: { findMany: jest.fn().mockResolvedValue([{ id: 'admin-1' }]) },
    notification: { createMany: jest.fn().mockResolvedValue({ count: 1 }) },
  };

  // getBalance reads outside a transaction, so the root client exposes the same
  // delegates as the transactional one.
  const prisma = {
    ...tx,
    $transaction: jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
  } as unknown as PrismaService;

  const config = {
    get: jest.fn().mockReturnValue(100000),
  } as unknown as ConfigService;
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
  } as unknown as PinoLogger;

  return { service: new WithdrawalsService(prisma, config, logger), tx };
}

function withdrawalRow() {
  return {
    id: 'withdrawal-1',
    organizerId: 'organizer-1',
    amountVnd: 300000n,
    status: 'PENDING',
    bankName: 'Vietcombank',
    bankAccountNumber: '0071000123456',
    bankAccountHolder: 'HUYNH QUOC KHANH',
    organizerNote: null,
    rejectionReason: null,
    transferReference: null,
    adminNote: null,
    reviewedAt: null,
    paidAt: null,
    createdAt: new Date('2026-08-08T00:00:00.000Z'),
    organizer: { fullName: 'Organizer', email: 'organizer@example.com' },
  };
}

const validRequest = {
  amountVnd: 300000,
  bankName: 'Vietcombank',
  bankAccountNumber: '0071000123456',
  bankAccountHolder: 'HUYNH QUOC KHANH',
};

describe('WithdrawalsService.create', () => {
  it('reserves open requests and paid payouts against settled revenue', async () => {
    const { service, tx } = buildService({
      settledRevenueVnd: 1_000_000n,
      openVnd: 0n,
      paidVnd: 400_000n,
    });

    await service.create('organizer-1', validRequest);

    expect(tx.order.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PAID',
          event: expect.objectContaining({ organizerId: 'organizer-1' }),
        }),
      }),
    );
    expect(tx.withdrawalRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizerId: 'organizer-1',
          amountVnd: 300000n,
        }),
      }),
    );
    expect(tx.notification.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          userId: 'admin-1',
          type: 'WITHDRAWAL_SUBMITTED',
        }),
      ]),
    });
  });

  it('rejects an amount above the available balance', async () => {
    const { service } = buildService({
      settledRevenueVnd: 1_000_000n,
      openVnd: 0n,
      paidVnd: 800_000n,
    });

    await expect(
      service.create('organizer-1', { ...validRequest, amountVnd: 300000 }),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.WITHDRAWAL_AMOUNT_EXCEEDS_BALANCE },
    });
  });

  it('rejects an amount below the configured minimum', async () => {
    const { service } = buildService({
      settledRevenueVnd: 1_000_000n,
      openVnd: 0n,
      paidVnd: 0n,
    });

    await expect(
      service.create('organizer-1', { ...validRequest, amountVnd: 50000 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects a second request while one is still open', async () => {
    const { service } = buildService(
      { settledRevenueVnd: 1_000_000n, openVnd: 300_000n, paidVnd: 0n },
      1,
    );

    await expect(
      service.create('organizer-1', validRequest),
    ).rejects.toMatchObject({
      response: { code: ErrorCode.WITHDRAWAL_REQUEST_ALREADY_OPEN },
    });
  });
});

describe('WithdrawalsService.getBalance', () => {
  it('floors the available amount at zero', async () => {
    const { service } = buildService({
      settledRevenueVnd: 100_000n,
      openVnd: 0n,
      paidVnd: 500_000n,
    });

    await expect(service.getBalance('organizer-1')).resolves.toMatchObject({
      settledRevenueVnd: 100000,
      withdrawnVnd: 500000,
      availableVnd: 0,
      minAmountVnd: 100000,
    });
  });
});
