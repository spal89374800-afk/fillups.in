import { io } from 'socket.io-client';
import { API_FALLBACK_ORIGIN } from './services/apiClient';

// ========================================================
// 🔌 REALTIME SOCKET (works from both Render URLs)
// ========================================================
// When the app is opened from the static frontend host, a bare `io()` tries to
// connect to that static host (there is no Socket.IO server there → 404), so
// order dispatch / chat / calls never arrive. Always connect to the API origin
// in that case; same-origin URLs keep using the current origin.
const pageOrigin = typeof window !== 'undefined' ? window.location.origin : '';
const socketUrl = pageOrigin && pageOrigin !== API_FALLBACK_ORIGIN ? API_FALLBACK_ORIGIN : undefined;

export const realtimeSocket = socketUrl
  ? io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity
    })
  : io({
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity
    });
