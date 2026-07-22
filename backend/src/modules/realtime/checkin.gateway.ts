import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { PrismaService } from '../../prisma/prisma.service';
import type { JwtPayload } from '../auth/jwt.strategy';

/** Payload broadcast to an event room on each successful check-in. */
export type CheckinBroadcast = {
  ticketId: string;
  ticketTypeName: string;
  checkedInCount: number;
  scannedAt: string;
};

type SocketUser = { id: string; role: string };

/**
 * Real-time channel for the organizer check-in dashboard. Clients authenticate
 * with their JWT during the handshake (a connection middleware, so the user is
 * attached before any message is handled), then `subscribe` to an event they
 * own; each VALID check-in is pushed to `event:<id>` so the dashboard updates
 * live.
 */
@Injectable()
@WebSocketGateway({
  namespace: '/realtime',
  cors: { origin: process.env.FRONTEND_URL ?? '*' },
})
export class CheckinGateway implements OnGatewayInit {
  @WebSocketServer() private server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server): void {
    // Authenticate during the handshake so `socket.data.user` is set before the
    // client's first message, avoiding a race with an async connection hook.
    server.use((socket: Socket, next: (err?: Error) => void) => {
      void this.authenticate(socket)
        .then((user) => {
          if (!user) {
            next(new Error('unauthorized'));
            return;
          }
          socket.data.user = user;
          next();
        })
        .catch(() => next(new Error('unauthorized')));
    });
  }

  private async authenticate(socket: Socket): Promise<SocketUser | null> {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) return null;
    const payload = this.jwt.verify<JwtPayload>(token, {
      secret: this.config.getOrThrow<string>('jwt.secret'),
    });
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true },
    });
    if (!user || user.status === 'BLOCKED') return null;
    return { id: user.id, role: user.role };
  }

  /** Joins the caller to an event room only if they own it (or are ADMIN). */
  @SubscribeMessage('subscribe')
  async onSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { eventId?: string },
  ): Promise<{ ok: boolean }> {
    const user = client.data.user as SocketUser | undefined;
    if (!user || !data?.eventId) return { ok: false };

    const event = await this.prisma.event.findUnique({
      where: { id: data.eventId },
      select: { organizerId: true },
    });
    if (!event) return { ok: false };
    if (user.role !== 'ADMIN' && event.organizerId !== user.id) {
      return { ok: false };
    }

    await client.join(`event:${data.eventId}`);
    return { ok: true };
  }

  emitCheckin(eventId: string, payload: CheckinBroadcast): void {
    this.server.to(`event:${eventId}`).emit('checkin', payload);
  }
}
