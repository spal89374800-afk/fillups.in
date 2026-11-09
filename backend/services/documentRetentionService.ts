import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import multer from 'multer';
import {
  vleOrdersStore,
  fillerOrdersStore,
  adminPaymentLedgerStore,
  persistOrder,
  isTerminalOrderStatus,
  archiveOrderSummary,
  deleteOrderFromMongo,
  removeOrdersFromStores,
  anonymizeAdminLedgerForOrder
} from './storeService.ts';
import { isMongoConnected } from '../config/db.ts';
import { emitOrderUpdate } from './realtimeService.ts';
import { computeFeeBreakdown } from './pricingService.ts';

// 🔒 ZERO DATA RETENTION: har document sirf 24 ghante tak store hota hai.
// Upload ke waqt expiresAt stamp hota hai (10 baje upload = agle din 10 baje purge),
// aur ek scheduler har 15 min me expired files + references silently delete karta hai.
export const DOCUMENT_RETENTION_MS = 24 * 60 * 60 * 1000;
export const RETENTION_SWEEP_INTERVAL_MS = 15 * 60 * 1000;

// 📅 ORDER RETENTION: complete/cancel hone ke 7 din baad poora order delete.
// Photo proof sirf 24 ghante (terminal state ke baad) rehta hai.
// Active order jo 7 din se dead hai use auto-cancel karke phir 7 din baad delete.
export const ORDER_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
export const PHOTO_PROOF_RETENTION_MS = 24 * 60 * 60 * 1000;
export const ACTIVE_ORDER_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000;

export const UPLOADS_DIR = path.resolve(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.jpg', '.jpeg', '.png']);

export interface UploadedDocumentFile {
  originalname: string;
  filename: string;
  size: number;
  path: string;
}

export const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const ext = normalizeExtension(file.originalname);
      cb(null, `${randomUUID()}${ext}`);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 10
  },
  fileFilter: (_req, file, cb) => {
    const ext = normalizeExtension(file.originalname);
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error('Only PDF, JPG and PNG documents are allowed.'));
      return;
    }
    cb(null, true);
  }
});

function normalizeExtension(name: string): string {
  const ext = path.extname(name || '').toLowerCase();
  if (ext === '.jpeg') return '.jpg';
  return ALLOWED_EXTENSIONS.has(ext) ? ext : '';
}

export function docTypeFromFilename(name: string): 'pdf' | 'jpg' | 'png' {
  const ext = path.extname(name || '').toLowerCase();
  if (ext === '.png') return 'png';
  if (ext === '.jpg' || ext === '.jpeg') return 'jpg';
  return 'pdf';
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// Multer file se Zero-Retention document metadata banao (disk par file already saved hai).
export function buildStoredDocument(file: UploadedDocumentFile) {
  const storageFile = file.filename;
  const id = path.parse(storageFile).name;
  return {
    id,
    name: file.originalname || 'document.pdf',
    type: docTypeFromFilename(file.originalname),
    size: formatFileSize(file.size),
    url: `/api/docs/${id}`,
    storageFile,
    zeroDataRetention: true as const,
    expiresAt: new Date(Date.now() + DOCUMENT_RETENTION_MS).toISOString(),
    retentionPolicy: 'EPHEMERAL_STREAM_ZERO_RETENTION' as const
  };
}

function safeUnlink(fileName: string): void {
  try {
    const target = path.resolve(UPLOADS_DIR, path.basename(fileName));
    if (target.startsWith(UPLOADS_DIR) && fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  } catch {
    // best-effort cleanup
  }
}

function isExpired(isoExpiry: unknown): boolean {
  if (typeof isoExpiry !== 'string' || !isoExpiry) return false;
  const at = Date.parse(isoExpiry);
  return Number.isFinite(at) && at <= Date.now();
}

function toMillis(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : null;
  }
  return null;
}

// Terminal order ka deletion clock completion/cancellation se chalta hai,
// order banne se nahi. Purane records me timestamp na ho to delete nahi karte.
function terminalClockMillis(order: any): number | null {
  return (
    toMillis(order?.completedAt) ??
    toMillis(order?.cancelledAt) ??
    toMillis(order?.createdAt)
  );
}

function activityClockMillis(order: any): number | null {
  return (
    toMillis(order?.lastActivityAt) ??
    toMillis(order?.updatedAt) ??
    toMillis(order?.createdAt)
  );
}

// Payment ya kaam ka koi bhi nishan ho to active order ko auto-cancel mat karo.
// Warna paisa aaya aur order gayab — reconciliation impossible ho jaati hai.
function hasPaymentOrWorkActivity(order: any): boolean {
  if (!order) return false;
  if (order.isPaymentDoneInApp) return true;
  if (order.paymentReportedAt || order.paymentTxnId) return true;
  if (order.paymentVerificationStatus) return true;
  if (order.completedFormPdfUrl || order.credentialsDispatched) return true;
  const splits = order.paymentSplits;
  if (splits && typeof splits === 'object') {
    for (const leg of ['govt', 'admin', 'operator']) {
      const split = (splits as any)[leg];
      if (!split) continue;
      if (
        split.status === 'confirmed' ||
        split.utr ||
        split.clientUtr ||
        split.clientConfirmed ||
        split.confirmedAt
      ) {
        return true;
      }
    }
  }
  return false;
}

function deleteReferencedFiles(order: any): void {
  const unlinkUrl = (url: unknown) => {
    if (typeof url !== 'string') return;
    const match = url.match(/\/api\/docs\/([^/?#]+)/);
    if (match?.[1]) safeUnlink(match[1]);
  };
  if (Array.isArray(order?.clientDocuments)) {
    for (const doc of order.clientDocuments) {
      if (doc?.storageFile) safeUnlink(doc.storageFile);
      else unlinkUrl(doc?.url);
    }
  }
  if (Array.isArray(order?.chatMessages)) {
    for (const msg of order.chatMessages) {
      const attachment = msg?.attachment;
      if (!attachment) continue;
      if (attachment.fileId) safeUnlink(attachment.fileId);
      else if ((attachment as any).storageFile) safeUnlink((attachment as any).storageFile);
      else unlinkUrl(attachment.url);
    }
  }
}

function buildAnonymizedArchive(order: any) {
  const breakdown = computeFeeBreakdown(order?.amountPaid, order?.govtFee);
  // Actual ledger amount available ho to wahi rakho — commission percent baad me
  // badal jaye to bhi archive me galat hisaab na aaye.
  const ledgerEntry = adminPaymentLedgerStore.find(entry => entry.orderId === order.id);
  const adminCommission = ledgerEntry
    ? Math.max(0, Number(ledgerEntry.amount) || 0)
    : breakdown.adminCommission;
  const operatorShare = Math.max(0, Math.round((breakdown.serviceFee - adminCommission) * 100) / 100);
  return {
    id: String(order.id),
    orderType: order.orderType,
    serviceName: order.serviceName,
    formTitle: order.formTitle,
    amountPaid: Number(order.amountPaid) || 0,
    govtFee: breakdown.govtFee,
    adminCommission,
    operatorShare,
    status: String(order.status || ''),
    createdAt: order.createdAt,
    completedAt: order.completedAt,
    cancelledAt: order.cancelledAt,
    deletedAt: new Date().toISOString()
  };
}

// 24 ghante purane documents: disk files delete + order se references silently hatao.
// Kuch "expired" likha nahi jata — data bas clean ho jata hai (privacy policy).
export function purgeExpiredDocuments(): void {
  const visited = new Set<string>();
  const touchedOrders: Array<{ id: string }> = [];

  const sweepOrder = (order: any) => {
    if (!order?.id || visited.has(order.id)) return;
    visited.add(order.id);
    let docsChanged = false;
    let messagesChanged = false;

    if (Array.isArray(order.clientDocuments)) {
      const kept = order.clientDocuments.filter((doc: any) => {
        if (doc && isExpired(doc.expiresAt)) {
          if (doc.storageFile) safeUnlink(doc.storageFile);
          docsChanged = true;
          return false;
        }
        return true;
      });
      if (docsChanged) order.clientDocuments = kept;
    }

    if (Array.isArray(order.chatMessages)) {
      const keptMessages = order.chatMessages.filter((msg: any) => {
        const attachment = msg?.attachment;
        if (!attachment || !isExpired(attachment.expiresAt)) return true;
        const diskName = (attachment as any).fileId || (attachment as any).storageFile;
        if (diskName) safeUnlink(diskName);
        messagesChanged = true;
        // Document wale message poori tarah clean (kuch baki nahi dikhna chahiye).
        return false;
      });
      if (messagesChanged) order.chatMessages = keptMessages;
    }

    if (docsChanged || messagesChanged) touchedOrders.push(order);
  };

  vleOrdersStore.forEach(sweepOrder);
  fillerOrdersStore.forEach(sweepOrder);

  // Orphan sweep: reference bhool gaye files bhi 24h par disk se delete.
  try {
    const now = Date.now();
    for (const entry of fs.readdirSync(UPLOADS_DIR)) {
      const full = path.join(UPLOADS_DIR, entry);
      try {
        const stat = fs.statSync(full);
        if (stat.isFile() && now - stat.mtimeMs >= DOCUMENT_RETENTION_MS) {
          fs.unlinkSync(full);
        }
      } catch {
        // ignore individual file failures
      }
    }
  } catch {
    // uploads dir unreadable — ignore
  }

  touchedOrders.forEach(order => {
    emitOrderUpdate(order);
    // Purge ko Mongo me bhi persist karo, warna restart par document wapas aa jaata hai.
    // touchActivity: false — cleanup se order "active" nahi ho jaana chahiye.
    void persistOrder(order, { touchActivity: false }).catch(error => {
      console.error('[Retention] Document purge persist failed:', error);
    });
  });
}

// 7-day order retention sweep:
//   1) Terminal order ka photo proof 24h baad hatao.
//   2) Terminal order 7 din baad archive + delete (files bhi).
//   3) Active order 7 din inactive ho to auto-cancel (payment/work ho to nahi).
export async function purgeExpiredOrders(): Promise<void> {
  const now = Date.now();
  const visited = new Set<string>();
  const toDelete: any[] = [];

  const sweepOrder = async (order: any) => {
    if (!order?.id || visited.has(order.id)) return;
    visited.add(order.id);

    if (isTerminalOrderStatus(order.status)) {
      const terminalAt = terminalClockMillis(order);
      if (terminalAt === null) return;
      const terminalAge = now - terminalAt;

      // Photo proof terminal state ke 24h baad delete.
      if (order.previewPhotoProof && terminalAge >= PHOTO_PROOF_RETENTION_MS) {
        const proofUrl = order.previewPhotoProof;
        delete order.previewPhotoProof;
        if (Array.isArray(order.chatMessages)) {
          order.chatMessages = order.chatMessages.filter((msg: any) => {
            const url = msg?.attachment?.url;
            return !url || url !== proofUrl;
          });
        }
        emitOrderUpdate(order);
        await persistOrder(order);
      }

      if (terminalAge >= ORDER_RETENTION_MS) {
        toDelete.push(order);
      }
      return;
    }

    const lastActivity = activityClockMillis(order);
    if (lastActivity === null) return;
    if (now - lastActivity < ACTIVE_ORDER_INACTIVITY_MS) return;
    if (hasPaymentOrWorkActivity(order)) return;

    order.status = 'cancelled';
    order.cancelledAt = new Date().toISOString();
    order.cancellationReason = 'Auto-cancelled after 7 days of inactivity';
    emitOrderUpdate(order);
    await persistOrder(order);
  };

  for (const order of [...vleOrdersStore, ...fillerOrdersStore]) {
    await sweepOrder(order);
  }

  if (!toDelete.length) return;

  // Mongo connected nahi hai to delete mat karo — warna restart par data wapas
  // aa sakta hai aur archive/delete mismatch ho jayega.
  if (!isMongoConnected()) {
    console.warn(`[Retention] ${toDelete.length} order(s) due for deletion, waiting for MongoDB.`);
    return;
  }

  const deletedIds = new Set<string>();
  for (const order of toDelete) {
    try {
      await archiveOrderSummary(buildAnonymizedArchive(order));
      const removed = await deleteOrderFromMongo(order.id);
      if (!removed) continue;
      anonymizeAdminLedgerForOrder(order.id);
      deleteReferencedFiles(order);
      deletedIds.add(order.id);
    } catch (error) {
      console.error(`[Retention] Failed to delete order ${order.id}:`, error);
    }
  }

  if (deletedIds.size > 0) {
    removeOrdersFromStores(deletedIds);
    console.log(`[Retention] Deleted ${deletedIds.size} terminal order(s) after the 7-day window.`);
  }
}

let sweepTimer: ReturnType<typeof setInterval> | null = null;

async function runRetentionSweep(): Promise<void> {
  purgeExpiredDocuments();
  try {
    await purgeExpiredOrders();
  } catch (error) {
    console.error('[Retention] Order retention sweep failed:', error);
  }
}

export function startDocumentRetentionScheduler(): void {
  if (sweepTimer) return;
  void runRetentionSweep();
  sweepTimer = setInterval(() => {
    void runRetentionSweep();
  }, RETENTION_SWEEP_INTERVAL_MS);
  if (typeof sweepTimer.unref === 'function') sweepTimer.unref();
}
