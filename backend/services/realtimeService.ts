import type { Server, Socket } from 'socket.io';
import { randomUUID } from 'node:crypto';
import {
  findAnyOrder,
  liveCameraSessionsStore,
  getAccountByToken,
  isOrderVisibleToAccount,
  orderBelongsToClient,
  findAccountForOperator,
  markAccountOnline,
  markAccountOffline,
  type UserAccount
} from './storeService.ts';
import { markOrderMessagesSeen, sendOrderMessage } from './orderMessageService.ts';
import type { ChatMessage } from '../types/index.ts';
import { readAuthSessionCookie } from './authCookieService.ts';

let realtimeServer: Server | null = null;
const joinedOrdersBySocket = new Map<string, Map<string, { role: 'client' | 'operator'; phone: string }>>();

// ============================================================
// 🟢 OPERATOR PRESENCE (real socket connection, not a manual status field)
// ============================================================
const onlineSocketsByAccount = new Map<string, Set<string>>();
const accountBySocket = new Map<string, UserAccount>();

function presenceKey(account: UserAccount): string {
  return String(account.id || account.cscId || account.phone || account.email || '').trim().toLowerCase();
}

function registerOnline(socketId: string, account: UserAccount): void {
  const key = presenceKey(account);
  if (!key) return;
  accountBySocket.set(socketId, account);
  const sockets = onlineSocketsByAccount.get(key) || new Set<string>();
  sockets.add(socketId);
  onlineSocketsByAccount.set(key, sockets);
  markAccountOnline(account);
}

function unregisterOnline(socketId: string): void {
  const account = accountBySocket.get(socketId);
  if (!account) return;
  const key = presenceKey(account);
  const sockets = onlineSocketsByAccount.get(key);
  sockets?.delete(socketId);
  if (sockets && sockets.size === 0) {
    onlineSocketsByAccount.delete(key);
    markAccountOffline(account);
  }
  accountBySocket.delete(socketId);
}

export function isAccountOnline(account?: UserAccount): boolean {
  if (!account) return false;
  const key = presenceKey(account);
  return Boolean(key && (onlineSocketsByAccount.get(key)?.size || 0) > 0);
}

export function isOperatorOnline(operator: { id?: string; cscId?: string; phone?: string; email?: string }): boolean {
  const account = findAccountForOperator(operator as any);
  return isAccountOnline(account);
}

export function onlineOperatorCount(): number {
  return onlineSocketsByAccount.size;
}

// 📞 In-app voice call sessions (WebRTC signaling relay, one call per order).
type CallSession = {
  orderId: string;
  callerSocketId: string;
  candidates: string[];
  acceptedBy?: string;
  ringTimeout?: ReturnType<typeof setTimeout>;
};
const activeCalls = new Map<string, CallSession>();

type ScreenShareSession = {
  orderId: string;
  shareId: string;
  operatorSocketId: string;
  clientSocketIds: string[];
  clientSocketId?: string;
  timeout?: ReturnType<typeof setTimeout>;
};
const activeScreenShares = new Map<string, ScreenShareSession>();

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

    // Join aur send dono yahi check use karte hain. Isse join ka race ya
    // purana socket session message bhejne ko block nahi karta.
    const authorizeParticipant = (
      orderId: string,
      participantRole: 'client' | 'operator' | null,
      phoneRaw: string,
      tokenRaw: string
    ): { error: string } | { phone: string } => {
      const phone = String(phoneRaw || '').replace(/\D/g, '').slice(-10);
      const found = orderId ? findAnyOrder(orderId) : null;
      if (!orderId || !found || !participantRole) {
        return { error: 'Order not found.' };
      }
      if (participantRole === 'client') {
        const account = getAccountByToken(tokenRaw) ||
          getAccountByToken((socket.handshake.auth as { token?: string } | undefined)?.token) ||
          getAccountByToken(readAuthSessionCookie(socket.handshake.headers.cookie));
        if (!account || account.role !== 'client' || !orderBelongsToClient(found.order, account)) {
          return { error: 'This order is not linked to the logged-in citizen account.' };
        }
        return { phone: String(account.phone || '').replace(/\D/g, '').slice(-10) };
      } else {
        // Operator join must prove a logged-in operator session that can access this order.
        const account = getAccountByToken(tokenRaw) ||
          getAccountByToken((socket.handshake.auth as { token?: string } | undefined)?.token) ||
          getAccountByToken(readAuthSessionCookie(socket.handshake.headers.cookie));
        if (!account) {
          return { error: 'Operator login required to join this order chat.' };
        }
        if (account.role === 'client') {
          return { error: 'Citizen accounts cannot join as operator.' };
        }
        if (!operatorCanAccessOrder(found.order, account)) {
          return { error: 'This order is not assigned or visible to your operator account.' };
        }
      }
      return { phone };
    };

    const finishScreenShare = (session: ScreenShareSession, reason: string) => {
      if (session.timeout) clearTimeout(session.timeout);
      activeScreenShares.delete(session.orderId);
      const recipients = new Set([
        session.operatorSocketId,
        ...session.clientSocketIds,
        ...(session.clientSocketId ? [session.clientSocketId] : [])
      ]);
      recipients.forEach(socketId => {
        server.sockets.sockets.get(socketId)?.emit('screen-share:ended', {
          orderId: session.orderId,
          shareId: session.shareId,
          reason
        });
      });
    };

    socket.on('order:join', (payload: {
      orderId?: string;
      role?: string;
      phone?: string;
      token?: string;
    }, acknowledge?: (result: object) => void) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const participantRole = payload?.role === 'client' ? 'client' : payload?.role === 'operator' ? 'operator' : null;
      const authorization = authorizeParticipant(orderId, participantRole, String(payload?.phone || ''), String(payload?.token || ''));
      if ('error' in authorization) {
        acknowledge?.({ success: false, error: authorization.error });
        return;
      }
      socket.join(orderRoom(orderId));
      joinedOrders.set(orderId, { role: participantRole as 'client' | 'operator', phone: authorization.phone });
      acknowledge?.({ success: true });
    });

    socket.on('screen-share:request', (
      payload: { orderId?: string; operatorName?: string },
      acknowledge?: (result: object) => void
    ) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      if (!orderId || joinedOrders.get(orderId)?.role !== 'operator') {
        acknowledge?.({ success: false, error: 'Join this order as its assigned operator before requesting screen sharing.' });
        return;
      }
      if (activeScreenShares.has(orderId)) {
        acknowledge?.({ success: false, error: 'A screen-share request is already active for this order.' });
        return;
      }
      const roomSockets = server.sockets.adapter.rooms.get(orderRoom(orderId));
      const clientSocketIds = roomSockets
        ? [...roomSockets].filter(socketId => joinedOrdersBySocket.get(socketId)?.get(orderId)?.role === 'client')
        : [];
      if (clientSocketIds.length === 0) {
        acknowledge?.({ success: false, error: 'The citizen is not connected to this order right now.' });
        return;
      }

      const session: ScreenShareSession = {
        orderId,
        shareId: randomUUID(),
        operatorSocketId: socket.id,
        clientSocketIds
      };
      activeScreenShares.set(orderId, session);
      session.timeout = setTimeout(() => finishScreenShare(session, 'timeout'), 60_000);
      const operatorName = String(payload?.operatorName || 'Jan Seva operator').trim().slice(0, 80);
      clientSocketIds.forEach(socketId => {
        const clientSocket = server.sockets.sockets.get(socketId);
        clientSocket?.emit('webrtc:config', { iceServers: getIceServers() });
        clientSocket?.emit('screen-share:request', {
          orderId,
          shareId: session.shareId,
          operatorName
        });
      });
      socket.emit('webrtc:config', { iceServers: getIceServers() });
      acknowledge?.({ success: true, orderId, shareId: session.shareId });
    });

    socket.on('screen-share:accept', (
      payload: { orderId?: string; shareId?: string },
      acknowledge?: (result: object) => void
    ) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const session = orderId ? activeScreenShares.get(orderId) : undefined;
      if (
        !session ||
        session.shareId !== payload?.shareId ||
        !session.clientSocketIds.includes(socket.id) ||
        joinedOrders.get(orderId)?.role !== 'client' ||
        session.clientSocketId
      ) {
        acknowledge?.({ success: false, error: 'This screen-share request is no longer available.' });
        return;
      }

      session.clientSocketId = socket.id;
      if (session.timeout) clearTimeout(session.timeout);
      session.timeout = undefined;
      const operatorSocket = server.sockets.sockets.get(session.operatorSocketId);
      operatorSocket?.emit('screen-share:accepted', {
        orderId,
        shareId: session.shareId,
        clientSocketId: socket.id
      });
      operatorSocket?.emit('webrtc:config', { iceServers: getIceServers() });
      socket.emit('webrtc:config', { iceServers: getIceServers() });
      acknowledge?.({ success: true });
    });

    socket.on('screen-share:decline', (payload: { orderId?: string; shareId?: string }) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const session = orderId ? activeScreenShares.get(orderId) : undefined;
      if (
        !session ||
        session.shareId !== payload?.shareId ||
        !session.clientSocketIds.includes(socket.id) ||
        joinedOrders.get(orderId)?.role !== 'client' ||
        session.clientSocketId
      ) return;
      finishScreenShare(session, 'declined');
    });

    socket.on('screen-share:signal', (
      payload: {
        orderId?: string;
        shareId?: string;
        targetSocketId?: string;
        description?: Record<string, unknown>;
        candidate?: Record<string, unknown>;
      },
      acknowledge?: (result: object) => void
    ) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const session = orderId ? activeScreenShares.get(orderId) : undefined;
      const targetSocketId = typeof payload?.targetSocketId === 'string' ? payload.targetSocketId : '';
      const isOperatorSignal = session?.operatorSocketId === socket.id && session.clientSocketId === targetSocketId;
      const isClientSignal = session?.clientSocketId === socket.id && session.operatorSocketId === targetSocketId;
      const targetSocket = targetSocketId ? server.sockets.sockets.get(targetSocketId) : undefined;
      if (
        !session ||
        session.shareId !== payload?.shareId ||
        !targetSocket ||
        (!isOperatorSignal && !isClientSignal) ||
        (!payload.description && !payload.candidate)
      ) {
        acknowledge?.({ success: false, error: 'Invalid or expired screen-share signaling request.' });
        return;
      }
      targetSocket.emit('screen-share:signal', {
        orderId,
        shareId: session.shareId,
        fromSocketId: socket.id,
        description: payload.description,
        candidate: payload.candidate
      });
      acknowledge?.({ success: true });
    });

    socket.on('screen-share:end', (payload: { orderId?: string; shareId?: string }) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const session = orderId ? activeScreenShares.get(orderId) : undefined;
      if (
        !session ||
        session.shareId !== payload?.shareId ||
        (socket.id !== session.operatorSocketId && socket.id !== session.clientSocketId)
      ) return;
      finishScreenShare(session, 'ended');
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
      clientMessageId?: string;
      replyTo?: ChatMessage['replyTo'];
      phone?: string;
      token?: string;
    }, acknowledge?: (result: object) => void) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      if (!orderId || (!payload.text?.trim() && !payload.attachment && !payload.audioDataUrl)) {
        acknowledge?.({ success: false, error: 'Provide a message before sending.' });
        return;
      }
      // Room join miss ho gaya ho (page refresh, purana socket, join race) to
      // send ko fail mat karo — sender ko verify karke khud join kara do.
      const participantRole = payload.sender === 'operator' ? 'operator' : 'client';
      const authorization = authorizeParticipant(
        orderId,
        participantRole,
        String(payload.phone || ''),
        String(payload.token || '')
      );
      if ('error' in authorization) {
        acknowledge?.({ success: false, error: authorization.error });
        return;
      }
      socket.join(orderRoom(orderId));
      joinedOrders.set(orderId, { role: participantRole, phone: authorization.phone });
      const result = sendOrderMessage(orderId, payload);
      acknowledge?.(result);
      // Message ab `sendOrderMessage` ke andar per-message persist hota hai —
      // yahan poora order save nahi karna (wahi write amplification thi).
    });

    // ✅ Ticks: recipient ka device bata deta hai ki message pahunch gaya
    // (delivered) ya dekh liya (read). Server timestamp save karke sirf order
    // room me halka status event bhejta hai — poora order nahi.
    const handleSeenStatus = (mode: 'delivered' | 'read') => (
      payload: {
        orderId?: string;
        role?: string;
        upToMessageId?: string;
        phone?: string;
        token?: string;
      },
      acknowledge?: (result: object) => void
    ) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const upToMessageId = typeof payload?.upToMessageId === 'string' ? payload.upToMessageId.trim() : '';
      const participantRole = payload?.role === 'client' ? 'client' : payload?.role === 'operator' ? 'operator' : null;
      if (!orderId || !upToMessageId || !participantRole) {
        acknowledge?.({ success: false, error: 'Provide the order and message to update.' });
        return;
      }
      const authorization = authorizeParticipant(
        orderId,
        participantRole,
        String(payload?.phone || ''),
        String(payload?.token || '')
      );
      if ('error' in authorization) {
        acknowledge?.({ success: false, error: authorization.error });
        return;
      }
      const result = markOrderMessagesSeen(orderId, participantRole, upToMessageId, mode);
      acknowledge?.(result);
      // Tick timestamps bhi per-message persist hote hain (markOrderMessagesSeen
      // ke andar) — poora order save nahi karna.
    };

    socket.on('chat:delivered', handleSeenStatus('delivered'));
    socket.on('chat:read', handleSeenStatus('read'));

    socket.on('dispatch:join', (payload: { role?: string; district?: string; operatorIds?: string[]; token?: string }) => {
      const district = String(payload?.district || '').normalize('NFKC').trim().toLocaleLowerCase('en-IN').replace(/\s+/g, ' ');
      // 🟢 Real presence: socket connected = online. Email sirf offline operators ko jaayegi.
      const token = typeof payload?.token === 'string' ? payload.token : '';
      const account = getAccountByToken(token) ||
        getAccountByToken((socket.handshake.auth as { token?: string } | undefined)?.token) ||
        getAccountByToken(readAuthSessionCookie(socket.handshake.headers.cookie));
      if (account && (account.role === 'vle' || account.role === 'filler')) {
        registerOnline(socket.id, account);
      }
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
        if (district) socket.join(`dispatch:filler-district:${district}`);
        socket.join('dispatch:filler-global');
        if (account) {
          const normalizedId = String(account.id || account.phone || '')
            .normalize('NFKC').trim().toLocaleLowerCase('en-IN').replace(/\s+/g, ' ');
          if (normalizedId) socket.join(`dispatch:filler-id:${normalizedId}`);
        }
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
      if (!session || session.status !== 'pending' || !socket.rooms.has(cameraRoom(token))) {
        acknowledge?.({ success: false, error: 'Join the active camera session before starting the camera.' });
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
      const senderOrderRole = joinedOrders.get(orderId)?.role;
      const targetOrderRole = joinedOrdersBySocket.get(targetSocketId)?.get(orderId)?.role;
      const senderIsAssignedOperator = senderOrderRole === 'operator' && socket.rooms.has(orderRoom(orderId));
      const targetIsAssignedOperator = targetOrderRole === 'operator' && targetSocket?.rooms.has(orderRoom(orderId));
      const senderIsCameraPeer = socket.rooms.has(cameraRoom(token));
      const targetIsCameraPeer = targetSocket?.rooms.has(cameraRoom(token)) === true;
      if (
        !session ||
        !senderIsCameraPeer ||
        !targetSocket ||
        !targetIsCameraPeer ||
        senderIsAssignedOperator === targetIsAssignedOperator ||
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
      if (!session || !socket.rooms.has(cameraRoom(token))) return;
      socket.to(cameraRoom(token)).emit('rtc:stop', { orderId, token });
    });

    // ============================================================
    // 📞 IN-APP VOICE CALL (WebRTC signaling relay through order room)
    // ============================================================
    socket.on('call:invite', (payload: { orderId?: string; peerLabel?: string }, acknowledge?: (result: object) => void) => {
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
      const session: CallSession = { orderId, callerSocketId: socket.id, candidates: others };
      // Agar 40s tak koi answer na kare to ring khud band ho jaye — warna
      // caller timeout ke baad bhi callee ke phone par ring baji rehti hai.
      session.ringTimeout = setTimeout(() => {
        const current = activeCalls.get(orderId);
        if (!current || current !== session || current.acceptedBy) return;
        activeCalls.delete(orderId);
        server.sockets.sockets.get(current.callerSocketId)?.emit('call:ended', { orderId, reason: 'no-answer' });
        current.candidates.forEach(id => {
          server.sockets.sockets.get(id)?.emit('call:ended', { orderId, reason: 'no-answer' });
        });
      }, 40000);
      (session.ringTimeout as { unref?: () => void }).unref?.();
      activeCalls.set(orderId, session);
      const peerLabel = typeof payload?.peerLabel === 'string' ? payload.peerLabel.trim().slice(0, 80) : '';
      others.forEach(id => {
        server.sockets.sockets.get(id)?.emit('call:incoming', {
          orderId,
          fromSocketId: socket.id,
          ...(peerLabel ? { peerLabel } : {})
        });
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
      if (session.ringTimeout) clearTimeout(session.ringTimeout);
      session.ringTimeout = undefined;
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
        if (session.ringTimeout) clearTimeout(session.ringTimeout);
        activeCalls.delete(orderId);
        server.sockets.sockets.get(session.callerSocketId)?.emit('call:ended', { orderId, reason: 'rejected' });
      }
    });

    socket.on('call:end', (payload: { orderId?: string }) => {
      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const session = orderId ? activeCalls.get(orderId) : undefined;
      if (!session) return;
      if (session.ringTimeout) clearTimeout(session.ringTimeout);
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
      unregisterOnline(socket.id);
      for (const session of [...activeScreenShares.values()]) {
        if (
          session.operatorSocketId === socket.id ||
          session.clientSocketId === socket.id ||
          session.clientSocketIds.includes(socket.id)
        ) {
          finishScreenShare(session, 'disconnected');
        }
      }
      // Active call ka peer turant inform karo taaki wo hang na ho.
      for (const [orderId, session] of [...activeCalls]) {
        if (session.callerSocketId === socket.id || session.acceptedBy === socket.id) {
          if (session.ringTimeout) clearTimeout(session.ringTimeout);
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

export function emitServiceCatalogUpdated(): void {
  realtimeServer?.emit('service-catalog:updated');
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
