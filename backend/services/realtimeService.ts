import type { Server, Socket } from 'socket.io';
import {
  findAnyOrder,
  liveCameraSessionsStore,
  getAccountByToken,
  isOrderVisibleToAccount,
  type UserAccount
} from './storeService.ts';
import { sendOrderMessage } from './orderMessageService.ts';
import type { ChatMessage } from '../types/index.ts';

let realtimeServer: Server | null = null;
const joinedOrdersBySocket = new Map<string, Map<string, { role: 'client' | 'operator'; phone: string }>>();

// 📞 In-app voice call sessions (WebRTC signaling relay, one call per order).
type CallSession = {
  orderId: string;
  callerSocketId: string;
  candidates: string[];
  acceptedBy?: string;
};
const activeCalls = new Map<string, CallSession>();

type IceServerConfig = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export function getIceServers(): IceServerConfig[] {
  const configuredServers = process.env.WEBRTC_ICE_SERVERS;
  if (!configuredServers) {
    return [{ urls: 'stun:stun.l.google.com:19302' }];
  }

  const parsed: unknown = JSON.parse(configuredServers);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('WEBRTC_ICE_SERVERS must be a non-empty JSON array of ICE server objects.');
  }
  if (parsed.some(server =>
    !server ||
    typeof server !== 'object' ||
    !('urls' in server) ||
    !(typeof server.urls === 'string' || (Array.isArray(server.urls) && server.urls.every((url: unknown) => typeof url === 'string')))
  )) {
    throw new Error('Each WEBRTC_ICE_SERVERS entry must have a string urls field or an array of URL strings.');
  }
  return parsed as IceServerConfig[];
}

function operatorCanAccessOrder(order: any, account: UserAccount): boolean {
  if (isOrderVisibleToAccount(order, account)) return true;
  const accountIds = new Set(
    [account.id, account.cscId, account.phone, account.email]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  );
  const assignedIds = [order.acceptedById, order.acceptedByVleId, order.acceptedByFillerId, order.targetOperatorPhone]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return assignedIds.some(value => accountIds.has(value));
}

export function setRealtimeServer(server: Server): void {
  realtimeServer = server;

  server.on('connection', (socket: Socket) => {
    const joinedOrders = new Map<string, { role: 'client' | 'operator'; phone: string }>();
    joinedOrdersBySocket.set(socket.id, joinedOrders);

    socket.on('order:join', (payload: {
      orderId?: string;
      role?: string;
      phone?: string;
      token?: string;
    }, acknowledge?: (result: object) => void) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const participantRole = payload?.role === 'client' ? 'client' : payload?.role === 'operator' ? 'operator' : null;
      const phone = String(payload?.phone || '').replace(/\D/g, '').slice(-10);
      const found = orderId ? findAnyOrder(orderId) : null;
      if (!orderId || !found || !participantRole) {
        acknowledge?.({ success: false, error: 'Order not found.' });
        return;
      }
      if (participantRole === 'client') {
        const orderPhone = String(found.order.clientPhone || '').replace(/\D/g, '').slice(-10);
        if (!phone || !orderPhone || phone !== orderPhone) {
          acknowledge?.({ success: false, error: 'This order is not linked to the logged-in client phone.' });
          return;
        }
      } else {
        // Operator join must prove a logged-in operator session that can access this order.
        const token = typeof payload?.token === 'string' ? payload.token : '';
        const account = getAccountByToken(token) ||
          getAccountByToken((socket.handshake.auth as { token?: string } | undefined)?.token);
        if (!account) {
          acknowledge?.({ success: false, error: 'Operator login required to join this order chat.' });
          return;
        }
        if (account.role === 'client') {
          acknowledge?.({ success: false, error: 'Citizen accounts cannot join as operator.' });
          return;
        }
        if (!operatorCanAccessOrder(found.order, account)) {
          acknowledge?.({ success: false, error: 'This order is not assigned or visible to your operator account.' });
          return;
        }
      }
      socket.join(orderRoom(orderId));
      joinedOrders.set(orderId, { role: participantRole, phone });
      acknowledge?.({ success: true });
    });

    socket.on('order:send-message', (payload: {
      orderId?: string;
      sender?: string;
      senderName?: string;
      text?: string;
      attachment?: ChatMessage['attachment'];
      isVoiceNote?: boolean;
      audioDataUrl?: string;
      audioDuration?: string;
    }, acknowledge?: (result: object) => void) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      if (!orderId || !joinedOrders.has(orderId) || (!payload.text?.trim() && !payload.attachment && !payload.audioDataUrl)) {
        acknowledge?.({ success: false, error: 'Join an order and provide a message before sending.' });
        return;
      }
      acknowledge?.(sendOrderMessage(orderId, payload));
    });

    socket.on('dispatch:join', (payload: { role?: string; district?: string; operatorIds?: string[] }) => {
      const district = String(payload?.district || '').normalize('NFKC').trim().toLocaleLowerCase('en-IN').replace(/\s+/g, ' ');
      if (payload?.role === 'vle') {
        if (district) socket.join(`dispatch:vle-district:${district}`);
        if (Array.isArray(payload.operatorIds)) {
          payload.operatorIds
            .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
            .forEach(id => {
              const normalizedId = id.normalize('NFKC').trim().toLocaleLowerCase('en-IN').replace(/\s+/g, ' ');
              socket.join(`dispatch:vle-id:${normalizedId}`);
            });
        }
      } else if (payload?.role === 'filler') {
        socket.join(district ? `dispatch:filler-district:${district}` : 'dispatch:filler-global');
      }
    });

    socket.on('live-camera:join', (payload: { token?: string }, acknowledge?: (result: object) => void) => {
      const token = typeof payload?.token === 'string' ? payload.token : '';
      const session = liveCameraSessionsStore.find(item => item.token === token);
      if (!session || session.status !== 'pending') {
        acknowledge?.({ success: false, error: 'Live camera request is unavailable.' });
        return;
      }
      socket.join(cameraRoom(token));
      socket.emit('webrtc:config', { iceServers: getIceServers() });
      acknowledge?.({ success: true, orderId: session.orderId });
    });

    socket.on('live-camera:ready', (payload: { token?: string }, acknowledge?: (result: object) => void) => {
      const token = typeof payload?.token === 'string' ? payload.token : '';
      const session = liveCameraSessionsStore.find(item => item.token === token);
      if (!session || session.status !== 'pending' || joinedOrders.get(session.orderId)?.role !== 'client') {
        acknowledge?.({ success: false, error: 'Join the active order before starting the camera session.' });
        return;
      }
      socket.join(cameraRoom(token));
      socket.to(cameraRoom(token)).emit('live-camera:ready', {
        token,
        orderId: session.orderId,
        clientSocketId: socket.id
      });
      acknowledge?.({ success: true });
    });

    // Client (citizen) ke phone par blink detect hone par operator ko signal.
    // Tabhi operator "Capture Citizen Photo" dabayega — authentic liveness.
    socket.on('live-camera:blink-verified', (payload: { token?: string }) => {
      const token = typeof payload?.token === 'string' ? payload.token : '';
      const session = liveCameraSessionsStore.find(item => item.token === token);
      if (!session || !socket.rooms.has(cameraRoom(token))) return;
      socket.to(cameraRoom(token)).emit('live-camera:blink-verified', {
        token,
        orderId: session.orderId
      });
    });

    // Agar citizen ke device par blink engine load nahi hua (offline), to
    // operator ko bata dete hain taaki wo capture block na ho.
    socket.on('live-camera:blink-unavailable', (payload: { token?: string }) => {
      const token = typeof payload?.token === 'string' ? payload.token : '';
      const session = liveCameraSessionsStore.find(item => item.token === token);
      if (!session || !socket.rooms.has(cameraRoom(token))) return;
      socket.to(cameraRoom(token)).emit('live-camera:blink-unavailable', {
        token,
        orderId: session.orderId
      });
    });

    socket.on('rtc:signal', (payload: {
      orderId?: string;
      token?: string;
      targetSocketId?: string;
      description?: Record<string, unknown>;
      candidate?: Record<string, unknown>;
    }, acknowledge?: (result: object) => void) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId : '';
      const token = typeof payload?.token === 'string' ? payload.token : '';
      const targetSocketId = typeof payload?.targetSocketId === 'string' ? payload.targetSocketId : '';
      const session = liveCameraSessionsStore.find(item =>
        item.token === token && item.orderId === orderId && item.status === 'pending'
      );
      const targetSocket = server.sockets.sockets.get(targetSocketId);
      const targetHasOrder = joinedOrdersBySocket.get(targetSocketId)?.has(orderId);
      if (
        !session ||
        !joinedOrders.has(orderId) ||
        !socket.rooms.has(cameraRoom(token)) ||
        !targetSocket ||
        !targetHasOrder ||
        !targetSocket.rooms.has(cameraRoom(token)) ||
        (!payload.description && !payload.candidate)
      ) {
        acknowledge?.({ success: false, error: 'Invalid or expired WebRTC signaling request.' });
        return;
      }

      targetSocket.emit('rtc:signal', {
        orderId,
        token,
        fromSocketId: socket.id,
        description: payload.description,
        candidate: payload.candidate
      });
      acknowledge?.({ success: true });
    });

    socket.on('rtc:stop', (payload: { orderId?: string; token?: string }) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId : '';
      const token = typeof payload?.token === 'string' ? payload.token : '';
      const session = liveCameraSessionsStore.find(item =>
        item.token === token && item.orderId === orderId && item.status === 'pending'
      );
      if (!session || !joinedOrders.has(orderId) || !socket.rooms.has(cameraRoom(token))) return;
      socket.to(cameraRoom(token)).emit('rtc:stop', { orderId, token });
    });

    // ============================================================
    // 📞 IN-APP VOICE CALL (WebRTC signaling relay through order room)
    // ============================================================
    socket.on('call:invite', (payload: { orderId?: string }, acknowledge?: (result: object) => void) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      if (!orderId || !joinedOrders.has(orderId)) {
        acknowledge?.({ success: false, error: 'Join the order before starting a call.' });
        return;
      }
      const existing = activeCalls.get(orderId);
      if (existing) {
        acknowledge?.({ success: false, error: existing.acceptedBy ? 'A call is already active on this order.' : 'A call is already ringing on this order.' });
        return;
      }
      const roomSockets = server.sockets.adapter.rooms.get(orderRoom(orderId));
      const others = [...(roomSockets || [])].filter(id => id !== socket.id);
      if (others.length === 0) {
        acknowledge?.({ success: false, error: 'The other party is not online right now.' });
        return;
      }
      activeCalls.set(orderId, { orderId, callerSocketId: socket.id, candidates: others });
      others.forEach(id => {
        server.sockets.sockets.get(id)?.emit('call:incoming', { orderId, fromSocketId: socket.id });
      });
      acknowledge?.({ success: true });
    });

    socket.on('call:accept', (payload: { orderId?: string }, acknowledge?: (result: object) => void) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const session = orderId ? activeCalls.get(orderId) : undefined;
      if (!session || !session.candidates.includes(socket.id)) {
        acknowledge?.({ success: false, error: 'No incoming call to accept.' });
        return;
      }
      session.acceptedBy = socket.id;
      session.candidates
        .filter(id => id !== socket.id)
        .forEach(id => server.sockets.sockets.get(id)?.emit('call:busy', { orderId }));
      server.sockets.sockets.get(session.callerSocketId)?.emit('call:accepted', {
        orderId,
        peerSocketId: socket.id
      });
      acknowledge?.({ success: true, peerSocketId: session.callerSocketId });
    });

    socket.on('call:reject', (payload: { orderId?: string }) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const session = orderId ? activeCalls.get(orderId) : undefined;
      if (!session || session.acceptedBy === socket.id) return;
      session.candidates = session.candidates.filter(id => id !== socket.id);
      if (session.candidates.length === 0) {
        activeCalls.delete(orderId);
        server.sockets.sockets.get(session.callerSocketId)?.emit('call:ended', { orderId, reason: 'rejected' });
      }
    });

    socket.on('call:end', (payload: { orderId?: string }) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const session = orderId ? activeCalls.get(orderId) : undefined;
      if (!session) return;
      activeCalls.delete(orderId);
      // Accepted peer ho to usko batao; warna saare ringing candidates ko inform karo
      // (caller ne ring ke dauraan call cancel ki).
      const peerId = session.acceptedBy || undefined;
      if (peerId) {
        server.sockets.sockets.get(peerId)?.emit('call:ended', { orderId, reason: 'ended' });
      }
      session.candidates
        .filter(id => id !== socket.id && id !== peerId)
        .forEach(id => server.sockets.sockets.get(id)?.emit('call:ended', { orderId, reason: 'cancelled' }));
    });

    socket.on('call:signal', (payload: {
      orderId?: string;
      targetSocketId?: string;
      description?: Record<string, unknown>;
      candidate?: Record<string, unknown>;
    }, acknowledge?: (result: object) => void) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const targetSocketId = typeof payload?.targetSocketId === 'string' ? payload.targetSocketId : '';
      const session = orderId ? activeCalls.get(orderId) : undefined;
      const participants = session
        ? [session.callerSocketId, ...(session.acceptedBy ? [session.acceptedBy] : [])]
        : [];
      const targetSocket = targetSocketId ? server.sockets.sockets.get(targetSocketId) : undefined;
      if (
        !session ||
        !session.acceptedBy ||
        !targetSocket ||
        !participants.includes(socket.id) ||
        !participants.includes(targetSocketId) ||
        (!payload.description && !payload.candidate)
      ) {
        acknowledge?.({ success: false, error: 'Invalid call signaling request.' });
        return;
      }
      targetSocket.emit('call:signal', {
        orderId,
        fromSocketId: socket.id,
        description: payload.description,
        candidate: payload.candidate
      });
      acknowledge?.({ success: true });
    });

    socket.on('disconnect', () => {
      joinedOrdersBySocket.delete(socket.id);
      // Active call ka peer turant inform karo taaki wo hang na ho.
      for (const [orderId, session] of [...activeCalls]) {
        if (session.callerSocketId === socket.id || session.acceptedBy === socket.id) {
          activeCalls.delete(orderId);
          const peerId = session.acceptedBy || undefined;
          if (peerId && peerId !== socket.id) {
            server.sockets.sockets.get(peerId)?.emit('call:ended', { orderId, reason: 'disconnected' });
          }
          session.candidates
            .filter(id => id !== socket.id && id !== peerId)
            .forEach(id => server.sockets.sockets.get(id)?.emit('call:ended', { orderId, reason: 'disconnected' }));
        } else {
          session.candidates = session.candidates.filter(id => id !== socket.id);
        }
      }
      // If this socket was part of a live camera session, tell the other peer to
      // stop so it does not hang waiting for a stream that will never arrive.
      for (const room of socket.rooms) {
        if (!room.startsWith('camera:')) continue;
        const token = room.slice('camera:'.length);
        const session = liveCameraSessionsStore.find(item => item.token === token);
        if (session && session.status === 'pending') {
          socket.to(room).emit('rtc:stop', { orderId: session.orderId, token });
        }
      }
    });
  });
}

export function emitOrderEvent(orderId: string, event: string, payload: unknown): void {
  realtimeServer?.to(orderRoom(orderId)).emit(event, payload);
}

export function emitOrderUpdate(order: { id: string }): void {
  emitOrderEvent(order.id, 'order:updated', order);
}

export function emitDispatchEvent(room: string, event: string, payload: unknown): void {
  realtimeServer?.to(room).emit(event, payload);
}

export function emitCameraRequest(orderId: string, payload: unknown): void {
  if (!realtimeServer) return;
  const roomSockets = realtimeServer.sockets.adapter.rooms.get(orderRoom(orderId));
  if (!roomSockets) return;
  for (const socketId of roomSockets) {
    if (joinedOrdersBySocket.get(socketId)?.get(orderId)?.role === 'client') {
      realtimeServer.to(socketId).emit('live-camera:requested', payload);
    }
  }
}

export function hasConnectedClient(orderId: string): boolean {
  const roomSockets = realtimeServer?.sockets.adapter.rooms.get(orderRoom(orderId));
  if (!roomSockets) return false;
  return [...roomSockets].some(socketId =>
    joinedOrdersBySocket.get(socketId)?.get(orderId)?.role === 'client'
  );
}

function orderRoom(orderId: string): string {
  return `order:${orderId}`;
}

function cameraRoom(token: string): string {
  return `camera:${token}`;
}
