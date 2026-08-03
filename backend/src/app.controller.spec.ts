import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { PinoLogger } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { buildUploadPublicId } from './modules/uploads/upload-target';
import { UploadsService } from './modules/uploads/uploads.service';
import { PrismaService } from './prisma/prisma.service';
import type { CurrentUserData } from './modules/auth/jwt.strategy';
import { AdminService } from './modules/admin/admin.service';

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
});
