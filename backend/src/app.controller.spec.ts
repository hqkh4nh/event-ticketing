import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { buildUploadPublicId } from './modules/uploads/upload-target';
import { UploadsService } from './modules/uploads/uploads.service';
import { PrismaService } from './prisma/prisma.service';
import type { CurrentUserData } from './modules/auth/jwt.strategy';

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
});
