import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PinoLogger } from 'nestjs-pino';
import { PrismaClient } from '../generated/prisma';

/**
 * Wraps the generated Prisma client. Prisma 7 requires a driver adapter for
 * a direct database connection, so the connection string is passed via PrismaPg.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(
    config: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    super({ adapter: new PrismaPg(config.getOrThrow<string>('database.url')) });
    this.logger.setContext(PrismaService.name);
  }

  async onModuleInit(): Promise<void> {
    this.logger.info('Connecting to database');

    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;
      this.logger.info('Database connected');
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.logger.error({ err }, 'Database connection failed');
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.info('Database disconnected');
  }
}
