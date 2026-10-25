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
  const newMessage = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sender,
    senderName: payload.senderName || (sender === 'operator' ? 'Operator' : 'Client'),
    text: payload.text || '',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    attachment: payload.attachment || undefined,
    isVoiceNote: payload.isVoiceNote || false,
    audioDataUrl: payload.audioDataUrl || undefined,
    audioDuration: payload.audioDuration || '0:05'
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
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
