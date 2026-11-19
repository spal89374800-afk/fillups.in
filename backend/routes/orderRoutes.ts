import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { findAnyOrder, isOrderVisibleToAccount, processDocumentWithZeroRetention, orderBelongsToClient, vleOrdersStore, fillerOrdersStore, persistOrder } from '../services/storeService.ts';
import { sendOrderMessage, deleteOrderMessage } from '../services/orderMessageService.ts';
import { emitOrderUpdate } from '../services/realtimeService.ts';
import { maybeCompleteOrder } from '../services/orderDispatchService.ts';
import { isRasterImageDataUrl } from '../services/mediaService.ts';
import { getRequestAccount } from '../middleware/securityMiddleware.ts';
import { documentUpload, buildStoredDocument, DOCUMENT_RETENTION_MS, UPLOADS_DIR } from '../services/documentRetentionService.ts';
import type { UserAccount } from '../services/storeService.ts';

export const orderRouter = Router();

// Cancel reason codes → exact text jo order aur citizen dashboard par dikhega.
const CANCEL_REASONS: Record<string, string> = {
  server_down: 'Official Website / Server Down',
  blurred_docs: 'Incomplete / Blurred Documents',
  citizen_request: 'Citizen Requested Cancellation',
  other: 'Other'
};

function accountIsAssignedOperator(order: any, account?: UserAccount): boolean {
  if (!account) return false;
  if (account.role === 'vle') {
    return (!!order.acceptedByVleId && order.acceptedByVleId === account.cscId) ||
      (!!order.acceptedById && order.acceptedById === account.cscId);
  }
  if (account.role === 'filler') {
    return (!!order.acceptedByFillerId && order.acceptedByFillerId === account.id) ||
      (!!order.acceptedById && order.acceptedById === account.id);
  }
  return false;
}

function accountCanAccessOrder(order: any, account?: UserAccount): boolean {
  if (!account) return false;
  if (orderBelongsToClient(order, account)) return true;
  // Socket join yahi visibility rule use karta hai — REST bhi wahi rule
  // follow kare, warna wahi operator socket se bhej sake aur REST se 403 paaye.
  if (isOrderVisibleToAccount(order, account)) return true;
  return accountIsAssignedOperator(order, account);
}

// ✅ Operator cancel — reason mandatory, citizen BLOCK nahi hota.
orderRouter.post('/orders/:id/cancel', async (req, res) => {
  const found = findAnyOrder(req.params.id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });

  const account = getRequestAccount(req);
  if (!accountIsAssignedOperator(found.order, account)) {
    return res.status(403).json({
      success: false,
      error: 'Only the assigned Jan Seva Kendra or Form Expert can cancel this order.'
    });
  }
  if (found.order.status === 'cancelled') {
    return res.status(409).json({ success: false, error: 'This order is already cancelled.', order: found.order });
  }
  // Paid/completed order ko cancel mat karo — warning payment ledger aur credentials
  // already settle ho chuke hote hain. Unke liye admin review ka rasta hai.
  if (found.order.status === 'paid' || found.order.status === 'completed' || found.order.isPaymentDoneInApp) {
    return res.status(409).json({
      success: false,
      error: 'A paid or completed order cannot be cancelled here. Contact the admin for a refund review.'
    });
  }

  const reasonCode = String(req.body?.reason || '').trim();
  const note = String(req.body?.note || '').trim().slice(0, 160);
  if (!CANCEL_REASONS[reasonCode]) {
    return res.status(400).json({ success: false, error: 'Select a valid cancellation reason.' });
  }
  if (reasonCode === 'other' && note.length < 3) {
    return res.status(400).json({ success: false, error: 'Please describe the cancellation reason (at least 3 characters).' });
  }

  const reasonText = reasonCode === 'other'
    ? `Other — ${note}`
    : CANCEL_REASONS[reasonCode];
  const order = found.order;
  order.status = 'cancelled';
  order.cancelledAt = new Date().toISOString();
  order.cancellationReason = reasonText;
  order.cancelledById = account?.id || account?.cscId;
  order.cancelledByName = account?.name;
  order.cancelledByRole = account?.role === 'vle' ? 'Jan Seva Kendra' : 'Student/Form Expert';
  // Koi bhi payment truth na chhodo — warna dispatch-whatsapp / payment endpoints
  // cancelled order ko dobara paid kar sakte hain. Cancel = payment cancelled.
  order.isPaymentDoneInApp = false;
  delete order.paymentVerificationStatus;
  delete order.paymentTxnId;
  delete order.paymentReportedAt;
  delete order.paymentSplits;
  delete order.presenceEndedAt;
  order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
  order.chatMessages.push({
    id: 'm-cancel-' + Date.now(),
    sender: 'operator',
    senderName: order.cancelledByRole || 'System',
    text: `🚫 Order cancelled. Reason: ${reasonText}. Citizen account is NOT blocked.`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  await persistOrder(order, { touchActivity: false });
  emitOrderUpdate(order);
  return res.json({
    success: true,
    message: `Order cancelled: ${reasonText}`,
    cancellationReason: reasonText,
    order
  });
});

// 💓 Presence heartbeat — page khula rahe to block nahi. Ye lastActivityAt ko touch nahi karta.
orderRouter.post('/orders/:id/presence', async (req, res) => {
  const found = findAnyOrder(req.params.id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  const account = getRequestAccount(req);
  if (!account || !orderBelongsToClient(found.order, account)) {
    return res.status(403).json({ success: false, error: 'Only the citizen who owns this order can send presence.' });
  }
  if (isTerminalOrderStatusForPresence(found.order.status)) {
    return res.json({ success: true, ignored: true });
  }

  const now = Date.now();
  const last = Date.parse(String(found.order.lastPresenceAt || ''));
  if (Number.isFinite(last) && now - last < 30_000) {
    return res.json({ success: true, throttled: true, lastPresenceAt: found.order.lastPresenceAt });
  }
  found.order.lastPresenceAt = new Date(now).toISOString();
  delete found.order.presenceEndedAt;
  await persistOrder(found.order, { touchActivity: false });
  return res.json({ success: true, lastPresenceAt: found.order.lastPresenceAt });
});

// Tab close / navigate par hint. Final decision server sweep lega — beacon fail ho to bhi galat block nahi.
orderRouter.post('/orders/:id/abandon', async (req, res) => {
  const found = findAnyOrder(req.params.id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  const account = getRequestAccount(req);
  if (!account || !orderBelongsToClient(found.order, account)) {
    return res.status(403).json({ success: false, error: 'Only the citizen who owns this order can mark presence ended.' });
  }
  if (isTerminalOrderStatusForPresence(found.order.status)) {
    return res.json({ success: true, ignored: true });
  }
  found.order.presenceEndedAt = new Date().toISOString();
  await persistOrder(found.order, { touchActivity: false });
  return res.json({ success: true, presenceEndedAt: found.order.presenceEndedAt });
});

function isTerminalOrderStatusForPresence(status: unknown): boolean {
  return status === 'cancelled' || status === 'completed' || status === 'expired';
}

// Send Live Chat Message in Workspace
const handleSendMessage = async (req: any, res: any) => {
  const found = findAnyOrder(req.params.id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  if (!accountCanAccessOrder(found.order, getRequestAccount(req))) {
    return res.status(403).json({ success: false, error: 'You do not have access to this order.' });
  }
  if (found.order.status === 'cancelled') {
    return res.status(409).json({
      success: false,
      error: `This order is cancelled. Reason: ${found.order.cancellationReason || 'Not specified'}. Chat is closed.`
    });
  }
  const result = sendOrderMessage(req.params.id, req.body);
  // Chat apni collection me per-message save hoti hai (sendOrderMessage ke
  // andar). Poora order save nahi karna — UI ko DB write ka wait bhi nahi.
  res.json(result);
};

orderRouter.post('/orders/:id/message', handleSendMessage);
orderRouter.post('/orders/:id/messages', handleSendMessage);

// Delete a chat message (soft delete — WhatsApp style)
const handleDeleteMessage = async (req: any, res: any) => {
  const found = findAnyOrder(req.params.id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  const account = getRequestAccount(req);
  if (!accountCanAccessOrder(found.order, account)) {
    return res.status(403).json({ success: false, error: 'You do not have access to this order.' });
  }
  if (found.order.status === 'cancelled') {
    return res.status(409).json({
      success: false,
      error: `This order is cancelled. Reason: ${found.order.cancellationReason || 'Not specified'}.`
    });
  }
  // Client apne 'client' messages delete karta hai, operator apne 'operator'
  // messages — role server par decide hota hai, client se nahi aata.
  const role: 'client' | 'operator' = account?.role === 'client' ? 'client' : 'operator';
  const result = deleteOrderMessage(req.params.id, req.params.messageId, role);
  if (!result.success) {
    return res.status(400).json(result);
  }
  // Delete bhi turant UI me dikhna chahiye — per-message DB update
  // (deleteOrderMessage ke andar) background me chalta hai, poora order nahi.
  res.json(result);
};

orderRouter.delete('/orders/:id/messages/:messageId', handleDeleteMessage);
orderRouter.post('/orders/:id/messages/:messageId/delete', handleDeleteMessage);

// Upload Photo Proof
orderRouter.post('/orders/:id/upload-proof', async (req, res) => {
  const { id } = req.params;
  const { photoUrl } = req.body;
  if (!isRasterImageDataUrl(photoUrl)) {
    return res.status(400).json({ success: false, error: 'Upload a real JPG, PNG, or WebP photo.' });
  }
  const found = findAnyOrder(id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  if (!accountIsAssignedOperator(found.order, getRequestAccount(req))) {
    return res.status(403).json({ success: false, error: 'Only the assigned operator can upload proof for this order.' });
  }
  if (found.order.status === 'cancelled') {
    return res.status(409).json({ success: false, error: 'This order is cancelled. Proof can no longer be updated.' });
  }

  const order = found.order;
  if (!order.proofSubmittedAt) order.proofSubmittedAt = new Date().toISOString();
  order.previewPhotoProof = photoUrl;
  order.status = 'proof_submitted';
  let opName = 'Operator';
  if (found.type === 'vle') opName = (order as any).acceptedByVleName || 'Operator';
  else opName = (order as any).acceptedByFillerName || 'Operator';

  order.chatMessages.push({
    id: 'm-proof-' + Date.now(),
    sender: 'operator',
    senderName: opName,
    text: '📸 I have filled the application draft and uploaded the photo proof! Please inspect all details carefully and click OK to unlock payment.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    attachment: {
      name: 'Application_Draft_Proof.jpg',
      type: 'jpg',
      url: order.previewPhotoProof || ''
    }
  });

  emitOrderUpdate(order);
  await persistOrder(order);
  res.json({ success: true, message: 'Photo proof submitted successfully!', order });
});

// Approve Proof by Client (OK Button)
orderRouter.post('/orders/:id/approve-proof', async (req, res) => {
  const { id } = req.params;
  const found = findAnyOrder(id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  const account = getRequestAccount(req);
  if (!account || !orderBelongsToClient(found.order, account)) {
    return res.status(403).json({ success: false, error: 'Only the client who owns this order can approve the proof.' });
  }

  const order = found.order;
  if (order.status === 'cancelled') {
    return res.status(409).json({ success: false, error: `This order is cancelled. Reason: ${order.cancellationReason || 'Not specified'}.` });
  }
  if (!order.previewPhotoProof || order.status !== 'proof_submitted') {
    return res.status(409).json({ success: false, error: 'There is no submitted photo proof to approve.' });
  }
  order.isProofApprovedByClient = true;
  order.chatMessages.push({
    id: 'm-apprv-' + Date.now(),
    sender: 'client',
    senderName: order.clientName || 'Citizen',
    text: '✅ Verified and Approved Photo Proof! Payment methods unlocked.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  emitOrderUpdate(order);
  await persistOrder(order);
  res.json({ success: true, message: 'Proof approved successfully!', order });
});

// Upload Final Completed Form PDF (operator only).
// Order complete tabhi hota hai jab client ka in-app payment confirm ho + yeh PDF upload ho.
orderRouter.post('/orders/:id/upload-completed-form', async (req, res) => {
  const { id } = req.params;
  const found = findAnyOrder(id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  if (!accountIsAssignedOperator(found.order, getRequestAccount(req))) {
    return res.status(403).json({ success: false, error: 'Only the assigned operator can upload the completed form PDF.' });
  }
  if (found.order.status === 'cancelled' || found.order.status === 'expired') {
    return res.status(409).json({ success: false, error: 'This order is closed. Final PDF can no longer be uploaded.' });
  }

  const pdfDataUrl = typeof req.body?.pdfDataUrl === 'string' ? req.body.pdfDataUrl : '';
  const rawName = String(req.body?.fileName || 'Completed_Form.pdf').trim().slice(0, 120) || 'Completed_Form.pdf';
  if (!/^data:application\/pdf;base64,[A-Za-z0-9+/=\s]+$/i.test(pdfDataUrl)) {
    return res.status(400).json({ success: false, error: 'Upload a valid PDF file (data:application/pdf;base64,...).' });
  }
  const base64 = pdfDataUrl.slice(pdfDataUrl.indexOf(',') + 1);
  if (!base64.replace(/\s+/g, '').startsWith('JVBER')) {
    return res.status(400).json({ success: false, error: 'The uploaded file is not a real PDF.' });
  }
  const approxBytes = Math.floor(base64.replace(/\s+/g, '').length * 0.75);
  if (approxBytes > 10 * 1024 * 1024) {
    return res.status(413).json({ success: false, error: 'PDF is too large. Maximum allowed size is 10 MB.' });
  }

  const order = found.order;
  let opName = 'Operator';
  opName = found.type === 'vle'
    ? ((order as any).acceptedByVleName || 'Operator')
    : ((order as any).acceptedByFillerName || 'Operator');

  order.completedFormPdfUrl = pdfDataUrl;
  order.completedFormPdfName = rawName.toLowerCase().endsWith('.pdf') ? rawName : `${rawName}.pdf`;
  order.completedFormUploadedAt = new Date().toISOString();

  // Order pehle se complete hai to sirf latest PDF save karo. Status, payment,
  // completedAt aur 7-day deletion clock bilkul nahi badalna chahiye.
  if (order.status === 'completed') {
    emitOrderUpdate(order);
    await persistOrder(order);
    return res.json({
      success: true,
      completed: true,
      message: '📄 Final PDF updated. Order completed hi rahega.',
      order
    });
  }

  order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
  order.chatMessages.push({
    id: 'm-final-pdf-' + Date.now(),
    sender: 'operator',
    senderName: opName,
    text: '📄 Final completed form PDF uploaded. Payment confirm hone par order complete ho jaayega.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    attachment: {
      name: order.completedFormPdfName,
      type: 'pdf',
      url: `/api/orders/${order.id}/completed-form`
    }
  });

  const completed = await maybeCompleteOrder(order);
  if (!completed) {
    emitOrderUpdate(order);
    await persistOrder(order);
  }

  return res.json({
    success: true,
    completed,
    message: completed
      ? '✅ Payment confirmed + final PDF uploaded. Order completed — aap ab naya bid le sakte hain.'
      : '📄 Final form PDF uploaded. Client payment confirm hote hi order complete ho jaayega.',
    order
  });
});

// Download completed form PDF (client + assigned operator).
orderRouter.get('/orders/:id/completed-form', (req, res) => {
  const found = findAnyOrder(req.params.id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  if (!accountCanAccessOrder(found.order, getRequestAccount(req))) {
    return res.status(403).json({ success: false, error: 'You do not have access to this document.' });
  }
  const pdfDataUrl = String(found.order.completedFormPdfUrl || '');
  const match = /^data:application\/pdf;base64,(.+)$/i.exec(pdfDataUrl);
  if (!match) return res.status(404).json({ success: false, error: 'No completed form PDF uploaded yet.' });

  const bytes = Buffer.from(match[1].replace(/\s+/g, ''), 'base64');
  const safeName = String(found.order.completedFormPdfName || 'Completed_Form.pdf')
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
  res.send(bytes);
});

// Upload Client Document to Vault (Strict Zero Data Retention Policy)
orderRouter.post('/orders/:id/upload-doc', async (req, res) => {  const { id } = req.params;
  const { name, type, url, size } = req.body;

  const found = findAnyOrder(id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  if (!accountCanAccessOrder(found.order, getRequestAccount(req))) {
    return res.status(403).json({ success: false, error: 'You do not have access to this order.' });
  }
  if (found.order.status === 'cancelled') {
    return res.status(409).json({ success: false, error: 'This order is cancelled. Documents can no longer be uploaded.' });
  }

  // Process under Zero Data Retention: Ephemeral in-memory transmission, auto-purged from server disk
  const doc = processDocumentWithZeroRetention({ name, type, url, size });

  found.order.clientDocuments.push(doc);
  found.order.chatMessages.push({
    id: 'm-doc-' + Date.now(),
    sender: 'client',
    senderName: found.order.clientName,
    text: `🔒 [Zero Data Retention] Document: ${doc.name} (${doc.size})`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    attachment: {
      name: doc.name,
      type: doc.type,
      url: doc.url,
      expiresAt: doc.expiresAt
    }
  });

  emitOrderUpdate(found.order);
  await persistOrder(found.order);
  res.json({
    success: true,
    message: '🔒 Document transmitted under Zero Data Retention (ZDR). Never stored on server disk.',
    zeroDataRetention: true,
    document: doc,
    order: found.order
  });
});

// Batch Upload Documents (Strict Zero Data Retention Policy)
// Frontend asli files FormData (multipart) me bhejta hai; files uploads/ me
// save hoti hain aur 24 ghante baad scheduler unhe automatically delete kar deta hai.
const handleDocumentBatchUpload = async (req: any, res: any) => {
  const discardUploadedFiles = () => {
    (req.files as Express.Multer.File[] | undefined)?.forEach(file => {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
    });
  };

  const { id } = req.params;
  const found = findAnyOrder(id);
  if (!found) {
    discardUploadedFiles();
    return res.status(404).json({ success: false, error: 'Order not found.' });
  }
  if (!accountCanAccessOrder(found.order, getRequestAccount(req))) {
    discardUploadedFiles();
    return res.status(403).json({ success: false, error: 'You do not have access to this order.' });
  }
  if (found.order.status === 'cancelled') {
    discardUploadedFiles();
    return res.status(409).json({
      success: false,
      error: `This order is cancelled. Reason: ${found.order.cancellationReason || 'Not specified'}. Documents cannot be uploaded.`
    });
  }

  const sender = req.body?.sender === 'operator' ? 'operator' : 'client';
  const senderName = req.body?.senderName || req.body?.clientName || found.order.clientName;
  const uploadedFiles = (req.files as Express.Multer.File[] | undefined) || [];

  if (uploadedFiles.length > 0) {
    const expiresAt = new Date(Date.now() + DOCUMENT_RETENTION_MS).toISOString();
    uploadedFiles.forEach((file, idx: number) => {
      const doc = { ...buildStoredDocument(file), expiresAt };
      found.order.clientDocuments.push(doc);
      found.order.chatMessages.push({
        id: 'm-doc-' + Date.now() + '-' + idx,
        sender,
        senderName,
        text: `🔒 [Zero Data Retention] Uploaded Document: ${doc.name} (${doc.size})`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachment: {
          name: doc.name,
          type: doc.type,
          url: doc.url,
          expiresAt: doc.expiresAt,
          fileId: doc.storageFile
        }
      });
    });
    emitOrderUpdate(found.order);
    await persistOrder(found.order);
    return res.json({
      success: true,
      message: '🔒 Document uploaded. It will be permanently deleted after 24 hours.',
      zeroDataRetention: true,
      order: found.order
    });
  }

  // Legacy JSON fallback (bina file bytes ke) — metadata only, 24h me clean.
  const { documents, clientName } = req.body;
  if (Array.isArray(documents)) {
    documents.forEach((docItem: any, idx: number) => {
      const doc = processDocumentWithZeroRetention(docItem);
      found.order.clientDocuments.push(doc);
      found.order.chatMessages.push({
        id: 'm-doc-' + Date.now() + '-' + idx,
        sender,
        senderName: senderName || clientName || found.order.clientName,
        text: `🔒 [Zero Data Retention] Uploaded Document: ${doc.name} (${doc.size})`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        attachment: {
          name: doc.name,
          type: doc.type,
          url: doc.url,
          expiresAt: doc.expiresAt
        }
      });
    });
  }

  emitOrderUpdate(found.order);
  await persistOrder(found.order);
  res.json({
    success: true,
    message: '🔒 Documents processed under Zero Data Retention (ZDR) policy.',
    zeroDataRetention: true,
    order: found.order
  });
};

orderRouter.post(
  '/orders/:id/documents/batch',
  (req, res, next) => {
    documentUpload.array('files', 10)(req, res, (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'File upload failed.';
        return res.status(400).json({ success: false, error: message });
      }
      next();
    });
  },
  handleDocumentBatchUpload
);

// Authenticated document download/view (24h retention ke baad 410 Gone).
orderRouter.get('/docs/:docId', (req, res) => {
  const account = getRequestAccount(req);
  if (!account) {
    return res.status(401).json({ success: false, error: 'Login required to open this document.' });
  }

  const docId = String(req.params.docId || '').trim();
  let matched: any = null;
  let order: any = null;
  for (const candidate of [...vleOrdersStore, ...fillerOrdersStore]) {
    const doc = (candidate.clientDocuments || []).find((d: any) => d?.id === docId);
    if (doc) {
      matched = doc;
      order = candidate;
      break;
    }
  }

  if (!matched || !matched.storageFile) {
    return res.status(404).json({ success: false, error: 'Document not found or already deleted.' });
  }
  if (!accountCanAccessOrder(order, account)) {
    return res.status(403).json({ success: false, error: 'You do not have access to this document.' });
  }
  if (matched.expiresAt && Date.parse(matched.expiresAt) <= Date.now()) {
    return res.status(410).json({ success: false, error: 'This document has been deleted after 24 hours.' });
  }

  const safeName = String(matched.name || 'document').replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.sendFile(path.join(UPLOADS_DIR, path.basename(matched.storageFile)), (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ success: false, error: 'Document file is no longer available.' });
    }
  });
});

orderRouter.post('/orders/:id/pay', (_req, res) => {
  return res.status(410).json({
    success: false,
    error: 'Direct UPI payments cannot be verified automatically. Submit the UTR for manual reconciliation; this endpoint never marks an order paid.'
  });
});

orderRouter.post('/orders/:id/payment-report', async (req, res) => {
  const found = findAnyOrder(req.params.id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  const account = getRequestAccount(req);
  if (!account || !orderBelongsToClient(found.order, account)) {
    return res.status(403).json({ success: false, error: 'Only the client who owns this order can report a payment.' });
  }
  if (found.order.status === 'cancelled') {
    return res.status(409).json({ success: false, error: `This order is cancelled. Reason: ${found.order.cancellationReason || 'Not specified'}.` });
  }
  if (!found.order.isProofApprovedByClient) {
    return res.status(409).json({ success: false, error: 'The client must approve the work proof before payment can be reported.' });
  }
  if (found.order.isPaymentDoneInApp) {
    return res.status(409).json({ success: false, error: 'This order is already marked as paid.' });
  }

  const utr = typeof req.body.utr === 'string' ? req.body.utr.trim().toUpperCase() : '';
  if (!/^[A-Z0-9]{6,22}$/.test(utr)) {
    return res.status(400).json({ success: false, error: 'Enter a valid 6–22 character UPI reference / UTR.' });
  }

  found.order.paymentTxnId = utr;
  found.order.paymentVerificationStatus = 'reported';
  found.order.paymentReportedAt = new Date().toISOString();
  found.order.chatMessages.push({
    id: 'm-pay-report-' + Date.now(),
    sender: 'client',
    senderName: found.order.clientName || 'Client',
    text: `UPI payment reported for manual reconciliation. Reference: ${utr}. This report is not proof of settlement; the order remains unpaid until independently verified.`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  emitOrderUpdate(found.order);
  await persistOrder(found.order);
  return res.status(202).json({
    success: true,
    paymentStatus: 'reported',
    message: 'Payment report received. The order is not marked paid; verify the UPI transaction in the recipient account before fulfillment.',
    order: found.order
  });
});

// Edit credentials after payment (operator can correct auto-generated values).
orderRouter.put('/orders/:id/credentials', async (req, res) => {
  const { id } = req.params;
  const found = findAnyOrder(id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  if (!accountIsAssignedOperator(found.order, getRequestAccount(req))) {
    return res.status(403).json({ success: false, error: 'Only the assigned operator can edit these credentials.' });
  }
  if (found.order.status === 'cancelled') {
    return res.status(409).json({
      success: false,
      error: `This order is cancelled. Reason: ${found.order.cancellationReason || 'Not specified'}.`
    });
  }
  if (!found.order.isPaymentDoneInApp) {
    return res.status(409).json({ success: false, error: 'Credentials can be edited only after all payment legs are confirmed.' });
  }

  const appNumber = String(req.body?.appNumber || '').trim();
  const pass = String(req.body?.pass || '').trim();
  if (!appNumber || !pass) {
    return res.status(400).json({ success: false, error: 'Application Number and Password are required.' });
  }
  if (appNumber.length > 80 || pass.length > 80) {
    return res.status(400).json({ success: false, error: 'Application Number and Password must be 80 characters or less.' });
  }

  const existing = found.order.credentialsDispatched;
  found.order.credentialsDispatched = {
    appNumber,
    pass,
    sentToWhatsApp: Boolean(existing?.sentToWhatsApp),
    sentToPhone: Boolean(existing?.sentToPhone)
  };

  found.order.chatMessages = Array.isArray(found.order.chatMessages) ? found.order.chatMessages : [];
  found.order.chatMessages.push({
    id: 'm-cred-edit-' + Date.now(),
    sender: 'operator',
    senderName: 'DigiSeva',
    text: `✏️ Application credentials updated. Application No: ${appNumber} | Portal Password: ${pass}`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  emitOrderUpdate(found.order);
  await persistOrder(found.order);
  res.json({ success: true, message: 'Application credentials updated. WhatsApp dispatch will use these values.', order: found.order });
});

// Dispatch Credentials to WhatsApp
orderRouter.post('/orders/:id/dispatch-whatsapp', async (req, res) => {
  const { id } = req.params;
  const found = findAnyOrder(id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  if (!accountCanAccessOrder(found.order, getRequestAccount(req))) {
    return res.status(403).json({ success: false, error: 'You do not have access to this order.' });
  }
  // 🚫 Critical: cancelled order ko kabhi bhi paid/active wapas mat karo.
  if (found.order.status === 'cancelled') {
    return res.status(409).json({
      success: false,
      error: `This order is cancelled. Reason: ${found.order.cancellationReason || 'Not specified'}. Credentials cannot be dispatched.`
    });
  }

  if (!found.order.isPaymentDoneInApp) {
    return res.status(403).json({
      success: false,
      error: 'Payment is not confirmed. A UPI reference report is not proof of settlement; independently reconcile the transfer before dispatching credentials.'
    });
  }

  if (!found.order.credentialsDispatched) {
    found.order.credentialsDispatched = {
      appNumber: 'APP' + Math.floor(100000000 + Math.random() * 900000000),
      pass: 'Pass@' + Math.floor(1000 + Math.random() * 9000),
      sentToWhatsApp: false,
      sentToPhone: false
    };
  }

  let opName = 'Operator';
  if (found.type === 'vle') {
    opName = found.order.acceptedByVleName || 'Operator';
  } else {
    opName = found.order.acceptedByFillerName || 'Operator';
  }

  found.order.status = 'paid';
  found.order.chatMessages.push({
    id: 'm-whats-' + Date.now(),
    sender: 'operator',
    senderName: opName,
    text: `📲 Application credentials are ready. Open the WhatsApp link and tap Send to deliver them to ${found.order.clientPhone}.\nApplication No: ${found.order.credentialsDispatched?.appNumber}\nPortal Pass: ${found.order.credentialsDispatched?.pass}`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  // Completion ke liye payment + final PDF dono chahiye.
  const completed = await maybeCompleteOrder(found.order);
  if (!completed) {
    emitOrderUpdate(found.order);
    await persistOrder(found.order);
  }

  res.json({
    success: true,
    completed,
    message: completed
      ? `✅ Order complete! Credentials sent to ${found.order.clientPhone}.`
      : `✅ Application credentials are ready. Final form PDF upload hone par order complete hoga.`,
    order: found.order
  });
});

// Rate Operator for Completed Order
orderRouter.post('/orders/:id/rate', async (req, res) => {
  const { id } = req.params;
  const { rating, review, clientName } = req.body;

  const found = findAnyOrder(id);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  const account = getRequestAccount(req);
  if (!account || !orderBelongsToClient(found.order, account)) {
    return res.status(403).json({ success: false, error: 'Only the client who owns this order can rate it.' });
  }
  if (found.order.status === 'cancelled') {
    return res.status(409).json({
      success: false,
      error: `This order is cancelled. Reason: ${found.order.cancellationReason || 'Not specified'}.`
    });
  }

  found.order.rating = Number(rating) || 5;
  found.order.review = review || '';
  found.order.ratedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString();

  found.order.chatMessages.push({
    id: 'm-rate-' + Date.now(),
    sender: 'client',
    senderName: clientName || found.order.clientName,
    text: `⭐ Rating Given: ${found.order.rating} / 5 Stars${review ? `\n💬 Review: "${review}"` : ''}`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  emitOrderUpdate(found.order);
  await persistOrder(found.order);
  res.json({ success: true, message: 'Rating saved successfully!', order: found.order });
});
