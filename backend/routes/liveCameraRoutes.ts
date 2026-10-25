import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { findAnyOrder, liveCameraSessionsStore, LiveCameraSession } from '../services/storeService.ts';
import { emitCameraRequest, emitOrderEvent, hasConnectedClient } from '../services/realtimeService.ts';
import { sendOrderMessage } from '../services/orderMessageService.ts';
import { isRasterImageDataUrl } from '../services/mediaService.ts';
import { watermarkLivePhoto } from '../services/imageWatermarkService.ts';

export const liveCameraRouter = Router();

// 1. Expert requests live camera photo from citizen
liveCameraRouter.post('/live-camera/request', (req, res) => {
  const { orderId, clientPhone, clientName, serviceName, expertName } = req.body;

  const found = typeof orderId === 'string' ? findAnyOrder(orderId) : null;
  if (!found) {
    return res.status(404).json({ success: false, error: 'Select an active order before requesting a live photo.' });
  }

  const normalizedPhone = String(found.order.clientPhone || '').replace(/\D/g, '').slice(-10);
  const requestedPhone = clientPhone ? String(clientPhone).replace(/\D/g, '').slice(-10) : normalizedPhone;
  if (!/^[6-9]\d{9}$/.test(normalizedPhone) || requestedPhone !== normalizedPhone) {
    return res.status(400).json({ success: false, error: 'The order does not have a valid client mobile number.' });
  }

  const token = `cam-${randomBytes(24).toString('hex')}`;
  const now = new Date().toISOString();

  const newSession: LiveCameraSession = {
    token,
    orderId,
    clientName: clientName || found.order.clientName || 'Citizen',
    clientPhone: normalizedPhone,
    serviceName: serviceName || found.order.serviceName || found.order.formTitle || 'Sarkari Form Filling',
    expertName: expertName || 'Jan Seva Expert',
    status: 'pending',
    createdAt: now
  };

  liveCameraSessionsStore.unshift(newSession);

  const baseUrl = (process.env.APP_URL || process.env.VITE_APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const liveCameraPageUrl = `${baseUrl}/#live-camera?token=${token}`;
  const whatsappText = `📸 ${newSession.expertName} requested a live photo for ${newSession.serviceName}. Open the secure request: ${liveCameraPageUrl}`;
  const whatsappUrl = `https://wa.me/91${normalizedPhone}?text=${encodeURIComponent(whatsappText)}`;
  const clientOnline = hasConnectedClient(orderId);
  const targetOrder: any = found.order;
  targetOrder.liveCameraRequests ||= [];
  targetOrder.liveCameraRequests.push(newSession);
  emitCameraRequest(orderId, newSession);
  sendOrderMessage(orderId, {
    sender: 'operator',
    senderName: newSession.expertName,
    text: '📸 A live photo was requested. The camera opens on the client device after the client accepts the request.'
  });

  res.json({
    success: true,
    message: clientOnline
      ? 'Live photo request delivered to the client in the app.'
      : 'The client is offline. Share the secure WhatsApp link so they can open the request.',
    clientOnline,
    token,
    liveCameraPageUrl,
    whatsappUrl: clientOnline ? undefined : whatsappUrl,
    session: newSession
  });
});

// 2. Citizen accesses live camera page via token
liveCameraRouter.get('/live-camera/session/:token', (req, res) => {
  const { token } = req.params;
  const session = liveCameraSessionsStore.find(s => s.token === token);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Live camera session not found or expired.' });
  }

  res.json({ success: true, session });
});

// 3. Citizen submits captured live photo
liveCameraRouter.post('/live-camera/submit', async (req, res) => {
  const { token, photoBase64 } = req.body;

  if (!token || !isRasterImageDataUrl(photoBase64)) {
    return res.status(400).json({ success: false, error: 'Token and a real JPG, PNG, or WebP photo are required.' });
  }

  const session = liveCameraSessionsStore.find(s => s.token === token);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Live camera session not found.' });
  }
  if (session.status !== 'pending') {
    return res.status(409).json({ success: false, error: 'This live photo request has already been completed.' });
  }

  let watermarkedPhoto: string;
  const capturedAt = new Date().toISOString();
  try {
    // Server-side watermark (timestamp + Application/Order ID) taaki photo misuse na ho.
    watermarkedPhoto = await watermarkLivePhoto(photoBase64, {
      applicationId: session.orderId,
      timestamp: capturedAt
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Could not watermark the live photo.'
    });
  }

  session.status = 'submitted';
  session.photoUrl = watermarkedPhoto;
  session.submittedAt = capturedAt;

  // Inject into corresponding order chat & preview proof in real-time
  if (session.orderId) {
    const found = findAnyOrder(session.orderId);
    const targetOrder: any = found?.order;
    if (targetOrder) {
      targetOrder.previewPhotoProof = watermarkedPhoto;
      targetOrder.status = 'proof_submitted';

      if (!targetOrder.clientDocuments) targetOrder.clientDocuments = [];
      const liveDocExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      targetOrder.clientDocuments.push({
        id: 'doc-live-' + Date.now(),
        name: 'Live_Camera_Captured_Photo.jpg',
        url: watermarkedPhoto,
        type: 'image/jpeg',
        uploadedAt: new Date().toLocaleTimeString(),
        expiresAt: liveDocExpiresAt
      });

      if (targetOrder.chatMessages) {
        targetOrder.chatMessages.push({
          id: 'cam-sub-' + Date.now(),
          sender: 'client',
          senderName: session.clientName || 'Citizen',
          text: `📸 Live Photo successfully captured and submitted via mobile camera!`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          attachment: {
            name: 'Live_Camera_Photo.jpg',
            type: 'jpg',
            url: watermarkedPhoto,
            expiresAt: liveDocExpiresAt
          }
        });
      }
      emitOrderEvent(session.orderId, 'live-camera:submitted', {
        session,
        order: targetOrder
      });
    }
  }

  res.json({
    success: true,
    message: '🎉 Live photo submitted successfully! Transferred instantly to form expert dashboard.',
    session
  });
});

// 4. Get session status for polling
liveCameraRouter.get('/live-camera/status/:token', (req, res) => {
  const { token } = req.params;
  const session = liveCameraSessionsStore.find(s => s.token === token);
  if (!session) return res.status(404).json({ success: false, error: 'Session not found' });
  res.json({ success: true, session });
});
