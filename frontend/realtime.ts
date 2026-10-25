import { io } from 'socket.io-client';

export const realtimeSocket = io({
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity
});
