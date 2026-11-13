import { io, Socket } from 'socket.io-client';
import type { Ack } from './types';

let socket: Socket | null = null;

export function getSocket() {
  return socket;
}

export function openSocket(url: string): Socket {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }
  socket = io(url, {
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    timeout: 8000,
  });
  return socket;
}

export function closeSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** emit with an ack + timeout; never throws, always resolves with {ok,msg?}. */
export function emitAck<T extends Ack = Ack>(ev: string, data?: unknown, timeoutMs = 4000): Promise<T> {
  return new Promise((resolve) => {
    if (!socket || !socket.connected) return resolve({ ok: false, msg: 'Server se connection nahi hai' } as T);
    socket.timeout(timeoutMs).emit(ev, data, (err: Error | null, res: T) => {
      resolve(err ? ({ ok: false, msg: 'Server jawab nahi de raha' } as T) : res);
    });
  });
}
