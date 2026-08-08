import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { PinoLogger } from 'nestjs-pino';
import { AppController } from '../../src/app.controller';
import { AppService } from '../../src/app.service';
import { AdminService } from '../../src/modules/admin/admin.service';
import type { CurrentUserData } from '../../src/modules/auth/jwt.strategy';
import { StatisticsService } from '../../src/modules/statistics/statistics.service';
import { buildUploadPublicId } from '../../src/modules/uploads/upload-target';
import { UploadsService } from '../../src/modules/uploads/uploads.service';
import { PrismaService } from '../../src/prisma/prisma.service';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    api: { resource: jest.fn() },
    uploader: { destroy: jest.fn() },
    utils: { api_sign_request: jest.fn() },
  },
}));

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('upload public IDs', () => {
    it('uses one stable avatar public ID per user', () => {
      expect(buildUploadPublicId('USER_AVATAR', 'user-1')).toBe(
        'eticket/users/user-1/avatar',
      );
    });

    it('uses one stable cover public ID per event', () => {
      expect(buildUploadPublicId('EVENT_COVER', 'user-1', 'event-1')).toBe(
        'eticket/events/event-1/cover',
      );
    });
  });

  describe('image deletion', () => {
    it('deletes an avatar asset before clearing its database URL', async () => {
      const config = {
        get: jest.fn((key: string) => {
          const values: Record<string, string> = {
            'cloudinary.cloudName': 'demo',
            'cloudinary.apiKey': 'key',
            'cloudinary.apiSecret': 'secret',
            'cloudinary.uploadPreset': 'eticket_images',
          };
          return values[key];
        }),
      } as unknown as ConfigService;
      const updateUser = jest.fn().mockResolvedValue(undefined);
      const prisma = {
        user: { update: updateUser },
      } as unknown as PrismaService;
      const destroy = cloudinary.uploader.destroy as jest.Mock;
      destroy.mockResolvedValue({ result: 'ok' });
      const service = new UploadsService(config, prisma);
      const user: CurrentUserData = {
        id: 'user-1',
        sessionId: 'session-1',
        email: 'user@example.com',
        fullName: 'Test User',
        phone: null,
        avatarUrl: 'https://example.com/avatar.jpg',
        role: 'ATTENDEE',
        status: 'ACTIVE',
        locale: 'VI',
      };

      await service.deleteUpload(user, { target: 'USER_AVATAR' });

      expect(destroy).toHaveBeenCalledWith('eticket/users/user-1/avatar', {
        invalidate: true,
      });
      expect(updateUser).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { avatarUrl: null },
      });
      expect(destroy.mock.invocationCallOrder[0]).toBeLessThan(
        updateUser.mock.invocationCallOrder[0],
      );
    });
  });

  describe('event cover editing', () => {
    it('rejects cover changes after an event is submitted for review', async () => {
      const config = {
        get: jest.fn((key: string) => {
          const values: Record<string, string> = {
            'cloudinary.cloudName': 'demo',
            'cloudinary.apiKey': 'key',
            'cloudinary.apiSecret': 'secret',
            'cloudinary.uploadPreset': 'eticket_images',
          };
          return values[key];
        }),
      } as unknown as ConfigService;
      const prisma = {
        event: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'event-1',
            status: 'PENDING_REVIEW',
          }),
        },
      } as unknown as PrismaService;
      const service = new UploadsService(config, prisma);
      const organizer: CurrentUserData = {
        id: 'organizer-1',
        sessionId: 'session-1',
        email: 'organizer@example.com',
        fullName: 'Organizer',
        phone: null,
        avatarUrl: null,
        role: 'ORGANIZER',
        status: 'ACTIVE',
        locale: 'VI',
      };

      await expect(
        service.createSignature(organizer, {
          target: 'EVENT_COVER',
          eventId: 'event-1',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('clears a draft cover with CAS before deleting it from Cloudinary', async () => {
      const config = {
        get: jest.fn((key: string) => {
          const values: Record<string, string> = {
            'cloudinary.cloudName': 'demo',
            'cloudinary.apiKey': 'key',
            'cloudinary.apiSecret': 'secret',
            'cloudinary.uploadPreset': 'eticket_images',
          };
          return values[key];
        }),
      } as unknown as ConfigService;
      const updateEvent = jest.fn().mockResolvedValue(undefined);
      const clearCover = jest.fn().mockResolvedValue({ count: 1 });
      const prisma = {
        event: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'event-1',
            status: 'DRAFT',
          }),
          update: updateEvent,
          updateMany: clearCover,
        },
      } as unknown as PrismaService;
      const destroy = cloudinary.uploader.destroy as jest.Mock;
      destroy.mockClear();
      destroy.mockResolvedValue({ result: 'ok' });
      const service = new UploadsService(config, prisma);
      const organizer: CurrentUserData = {
        id: 'organizer-1',
        sessionId: 'session-1',
        email: 'organizer@example.com',
        fullName: 'Organizer',
        phone: null,
        avatarUrl: null,
        role: 'ORGANIZER',
        status: 'ACTIVE',
        locale: 'VI',
      };

      await service.deleteUpload(organizer, {
        target: 'EVENT_COVER',
        eventId: 'event-1',
      });

      expect(clearCover).toHaveBeenCalledWith({
        where: {
          id: 'event-1',
          organizerId: 'organizer-1',
          status: 'DRAFT',
        },
        data: { coverImageUrl: null },
      });
      expect(clearCover.mock.invocationCallOrder[0]).toBeLessThan(
        destroy.mock.invocationCallOrder[0],
      );
    });
  });

  describe('admin event approval', () => {
    it('publishes the event and notifies its organizer atomically', async () => {
      const existing = {
        id: 'event-1',
        organizerId: 'organizer-1',
        title: 'Summer Night',
        venue: 'Main Hall',
        status: 'PENDING_REVIEW',
        featured: false,
        startAt: new Date('2026-08-10T12:00:00.000Z'),
        organizer: { fullName: 'Organizer' },
        ticketTypes: [],
      };
      const published = { ...existing, status: 'PUBLISHED' };
      const createNotification = jest.fn().mockResolvedValue(undefined);
      const tx = {
        event: {
          findUnique: jest.fn().mockResolvedValue(existing),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          findUniqueOrThrow: jest.fn().mockResolvedValue(published),
        },
        notification: { create: createNotification },
      };
      const prisma = {
        $transaction: jest.fn(
          (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
        ),
      } as unknown as PrismaService;
      const logger = {
        setContext: jest.fn(),
        info: jest.fn(),
      } as unknown as PinoLogger;
      const service = new AdminService(prisma, logger);

      const result = await service.approveEvent('admin-1', 'event-1');

      expect(result.status).toBe('PUBLISHED');
      expect(tx.event.updateMany).toHaveBeenCalledWith({
        where: { id: 'event-1', status: 'PENDING_REVIEW' },
        data: { status: 'PUBLISHED' },
      });
      expect(createNotification).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'organizer-1',
          type: 'EVENT_APPROVED',
        }),
      });
    });
  });

  describe('sales statistics', () => {
    it('builds all-time KPIs, a 30-day trend, and top events from paid orders', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-08-08T12:00:00.000Z'));
      const dailyAggregate = jest.fn().mockResolvedValue([
        {
          date: '2026-08-08',
          revenueVnd: 500_000n,
          ticketsSold: 2n,
        },
      ]);
      const dailyOrders = jest.fn().mockResolvedValue([]);
      const prisma = {
        $queryRaw: dailyAggregate,
        order: {
          aggregate: jest.fn().mockResolvedValue({
            _sum: { totalVnd: 700_000n },
            _count: { id: 2 },
          }),
          findMany: dailyOrders,
          groupBy: jest.fn().mockResolvedValue([
            {
              eventId: 'event-1',
              _sum: { totalVnd: 500_000n },
              _count: { id: 1 },
            },
          ]),
        },
        orderItem: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: 3 } }),
          groupBy: jest
            .fn()
            .mockResolvedValue([{ eventId: 'event-1', _sum: { quantity: 2 } }]),
        },
        event: {
          count: jest.fn().mockResolvedValue(4),
          findMany: jest
            .fn()
            .mockResolvedValue([{ id: 'event-1', title: 'Summer Night' }]),
        },
      } as unknown as PrismaService;
      const service = new StatisticsService(prisma);

      const result = await service.getAdminStatistics();

      expect(result.summary).toEqual({
        paidRevenueVnd: 700_000,
        ticketsSold: 3,
        paidOrders: 2,
        publishedEvents: 4,
      });
      expect(result.daily).toHaveLength(30);
      expect(result.daily.at(-1)).toEqual({
        date: '2026-08-08',
        revenueVnd: 500_000,
        ticketsSold: 2,
      });
      expect(dailyOrders).not.toHaveBeenCalled();
      expect(dailyAggregate).toHaveBeenCalledTimes(1);
      expect(result.topEvents).toEqual([
        {
          id: 'event-1',
          title: 'Summer Night',
          revenueVnd: 500_000,
          ticketsSold: 2,
          paidOrders: 1,
        },
      ]);
      jest.useRealTimers();
    });

    it('scopes every organizer statistic to events owned by that organizer', async () => {
      const orderAggregate = jest.fn().mockResolvedValue({
        _sum: { totalVnd: null },
        _count: { id: 0 },
      });
      const ticketAggregate = jest
        .fn()
        .mockResolvedValue({ _sum: { quantity: null } });
      const eventCount = jest.fn().mockResolvedValue(0);
      const dailyOrders = jest.fn().mockResolvedValue([]);
      const dailyAggregate = jest.fn().mockResolvedValue([]);
      const topOrders = jest.fn().mockResolvedValue([]);
      const prisma = {
        $queryRaw: dailyAggregate,
        order: {
          aggregate: orderAggregate,
          findMany: dailyOrders,
          groupBy: topOrders,
        },
        orderItem: { aggregate: ticketAggregate },
        event: { count: eventCount },
      } as unknown as PrismaService;
      const service = new StatisticsService(prisma);

      const result = await service.getOrganizerStatistics('organizer-1');

      expect(orderAggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: 'PAID',
            event: { organizerId: 'organizer-1' },
          },
        }),
      );
      expect(ticketAggregate).toHaveBeenCalledWith({
        where: {
          order: {
            status: 'PAID',
            event: { organizerId: 'organizer-1' },
          },
        },
        _sum: { quantity: true },
      });
      expect(eventCount).toHaveBeenCalledWith({
        where: { status: 'PUBLISHED', organizerId: 'organizer-1' },
      });
      expect(dailyOrders).not.toHaveBeenCalled();
      expect(topOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PAID',
            event: { organizerId: 'organizer-1' },
          }),
        }),
      );
      expect(result.summary).toEqual({
        paidRevenueVnd: 0,
        ticketsSold: 0,
        paidOrders: 0,
        publishedEvents: 0,
      });
      expect(result.daily).toHaveLength(30);
      expect(result.topEvents).toEqual([]);
      expect(dailyAggregate).toHaveBeenCalledTimes(1);
      expect(
        (dailyAggregate.mock.calls[0]?.[0] as { values: unknown[] }).values,
      ).toContain('organizer-1');
    });
  });
});
