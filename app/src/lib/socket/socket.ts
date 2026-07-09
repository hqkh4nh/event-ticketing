import { io, type Socket } from 'socket.io-client';
import { tokenStorage } from '@/lib/auth/token-storage';
import { config } from '@/lib/config';

/**
 * Creates a JWT-authenticated Socket.IO client. Used for the live check-in
 * dashboard (the server joins the socket to a per-event room).
 */
export async function createSocket(namespace = ''): Promise<Socket> {
  const token = await tokenStorage.get();
  return io(`${config.apiUrl}${namespace}`, {
    transports: ['websocket'],
    auth: token ? { token } : undefined,
  });
}
