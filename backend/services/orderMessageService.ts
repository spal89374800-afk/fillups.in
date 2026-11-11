import { findAnyOrder, normalizeLocation, vleOrdersStore } from './storeService.ts';
import { emitDispatchEvent, emitOrderEvent } from './realtimeService.ts';
import type { ChatMessage } from '../types/index.ts';

export function sendOrderMessage(
  orderId: string,
  payload: {
    sender?: string;
    senderName?: string;
    text?: string;
    attachment?: ChatMessage['attachment'];
    isVoiceNote?: boolean;
    audioDataUrl?: string;
    audioDuration?: string;
    clientMessageId?: string;
    replyTo?: ChatMessage['replyTo'];
  }
) {
  let found = findAnyOrder(orderId);
  if (!found) {
    const newOrder: any = {
      id: orderId || `JSK-${Math.floor(1000 + Math.random() * 9000)}`,
      serviceName: 'Jan Seva Kendra Document Service',
      clientId: 'client-999',
      clientName: payload.senderName || 'Citizen',
      clientPhone: '',
      clientEmail: '',
      district: '',
      city: '',
      status: 'accepted',
      amountPaid: 150,
      createdAt: new Date().toISOString(),
      notificationsSent: { phone: false, email: false },
      chatMessages: [],
      clientDocuments: []
    };
    vleOrdersStore.unshift(newOrder);
    found = { type: 'vle', order: newOrder };
  }

  const sender: 'client' | 'operator' = payload.sender === 'operator' ? 'operator' : 'client';

  // Idempotency: agar yahi clientMessageId pehle save ho chuki hai (socket
  // deliver ho gaya par ack timeout hua, phir REST fallback aaya) to duplicate
  // message save na karo — bas existing message wapas do.
  const clientMessageId = typeof payload.clientMessageId === 'string' ? payload.clientMessageId.trim() : '';
  if (clientMessageId) {
    const existing = Array.isArray(found.order.chatMessages)
      ? found.order.chatMessages.find((message: ChatMessage) => message.id === clientMessageId)
      : undefined;
    if (existing) {
      return {
        success: true,
        message: 'Message already sent.',
        chatMessage: existing,
        order: found.order
      };
    }
  }

  const newMessage = {
    id: clientMessageId || `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sender,
    senderName: payload.senderName || (sender === 'operator' ? 'Operator' : 'Client'),
    text: payload.text || '',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: new Date().toISOString(),
    attachment: payload.attachment || undefined,
    isVoiceNote: payload.isVoiceNote || false,
    audioDataUrl: payload.audioDataUrl || undefined,
    audioDuration: payload.audioDuration || '0:05',
    // Reply preview ko sanitize karke store karo — client se aaya data
    // seedha DB me nahi jaata, length bhi cap hai.
    replyTo: (() => {
      const reply = payload.replyTo;
      if (!reply || typeof reply !== 'object') return undefined;
      const replyId = typeof reply.id === 'string' ? reply.id.trim().slice(0, 120) : '';
      if (!replyId) return undefined;
      return {
        id: replyId,
        senderName: String(reply.senderName || '').trim().slice(0, 80),
        text: String(reply.text || '').trim().slice(0, 300),
        ...(reply.isVoiceNote ? { isVoiceNote: true } : {})
      };
    })()
  };
  found.order.chatMessages.push(newMessage);

  const isAccepted = Boolean(
    (found.order as any).acceptedByVleName ||
    (found.order as any).acceptedByFillerName ||
    (found.order as any).acceptedByName ||
    found.order.status === 'accepted' ||
    found.order.status === 'proof_submitted' ||
    found.order.status === 'completed'
  );

  if (sender === 'client' && !isAccepted) {
    found.order.chatMessages.push({
      id: `m-wait-${Date.now()}`,
      sender: 'operator',
      senderName: 'Jan Seva Dispatch Center',
      text: '⏳ Please wait: Your message has been received. Certified Jan Seva Kendra operators and Form Filler experts in your area are reviewing your request. Live interaction will proceed as soon as an expert accepts your request.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: new Date().toISOString()
    });
  }

  const result = {
    success: true,
    message: 'Message sent.',
    chatMessage: newMessage,
    order: found.order
  };
  emitOrderEvent(orderId, 'order:message', result);
  if (sender === 'client' && !isAccepted) {
    const district = normalizeLocation(found.order.district);
    const isFormFilling = ['online_form_filling', 'custom_form'].includes(String((found.order as any).orderType || ''));
    const availableOperatorIds = (found.order as any).availableOperatorIds;
    if (Array.isArray(availableOperatorIds) && availableOperatorIds.length > 0) {
      availableOperatorIds.forEach((id: unknown) => {
        if (typeof id === 'string' && id.trim()) {
          emitDispatchEvent(
            `dispatch:vle-id:${normalizeLocation(id)}`,
            'dispatch:message',
            result
          );
        }
      });
    } else if (district) {
      emitDispatchEvent(`dispatch:vle-district:${district}`, 'dispatch:message', result);
    }
    if (isFormFilling) {
      if (district) {
        emitDispatchEvent(`dispatch:filler-district:${district}`, 'dispatch:message', result);
      } else {
        emitDispatchEvent('dispatch:filler-global', 'dispatch:message', result);
      }
    }
  }
  return result;
}

// ======================================================
// 🗑️ Soft delete (WhatsApp style)
// ======================================================
// Rules:
//   • Sirf apna bheja hua message delete ho sakta hai
//     (client apne 'client' messages, operator apne 'operator' messages).
//   • 15 minute ke andar hi delete ho sakta hai.
//   • Content scrub ho jaata hai (text / voice audio / attachment link),
//     par message record DB me rehta hai — chat dispute evidence hai.
//   • Deleted message par reply karne wale messages ka quote bhi scrub
//     hota hai, warna deleted text wahan se leak ho jaata.
const MESSAGE_DELETE_WINDOW_MS = 15 * 60 * 1000;

export function deleteOrderMessage(
  orderId: string,
  messageId: string,
  role: 'client' | 'operator'
) {
  const found = findAnyOrder(orderId);
  if (!found) {
    return { success: false, error: 'Order not found.' };
  }

  const messages: ChatMessage[] = Array.isArray(found.order.chatMessages)
    ? found.order.chatMessages
    : [];
  const target = messages.find(message => message.id === messageId);
  if (!target) {
    return { success: false, error: 'Message not found.' };
  }

  if (target.isDeleted) {
    // Already deleted — idempotent success.
    return { success: true, message: 'Message already deleted.', order: found.order };
  }

  if (target.sender !== role) {
    return {
      success: false,
      error: 'Aap sirf apna bheja hua message delete kar sakte hain.'
    };
  }

  // Purane messages me createdAt nahi hai — unki age verify nahi ho sakti,
  // isliye unhe allowed rakha hai. Naye messages par 15-minute limit lagti hai.
  if (target.createdAt) {
    const createdAtMs = new Date(target.createdAt).getTime();
    if (Number.isFinite(createdAtMs) && Date.now() - createdAtMs > MESSAGE_DELETE_WINDOW_MS) {
      return {
        success: false,
        error: '15 minute ke baad message delete nahi ho sakta.'
      };
    }
  }

  // Content scrub — record rehta hai, dikhane layak kuch nahi bachta.
  target.isDeleted = true;
  target.deletedAt = new Date().toISOString();
  target.deletedBy = role;
  target.text = '';
  target.attachment = undefined;
  target.audioDataUrl = undefined;
  target.audioDuration = undefined;
  target.isVoiceNote = false;

  // Is deleted message ko quote karne wale messages ka preview bhi scrub
  // karo — warna deleted text quote me dikhta rahega.
  const deletedPlaceholder = '🚫 Yeh message delete kar diya gaya';
  messages.forEach(message => {
    if (message.replyTo && message.replyTo.id === target.id) {
      message.replyTo = {
        ...message.replyTo,
        text: deletedPlaceholder,
        isVoiceNote: false
      };
    }
  });

  const result = { success: true, message: 'Message deleted.', order: found.order };
  // `order:updated` already frontend me suna jaata hai — poora order replace
  // ho jaata hai, isliye delete dono taraf live dikhta hai.
  emitOrderEvent(orderId, 'order:updated', found.order);
  return result;
}
