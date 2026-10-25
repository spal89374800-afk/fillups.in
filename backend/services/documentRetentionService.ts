import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { vleOrdersStore, fillerOrdersStore } from './storeService.ts';
import { emitOrderUpdate } from './realtimeService.ts';

// 🔒 ZERO DATA RETENTION: har document sirf 24 ghante tak store hota hai.
// Upload ke waqt expiresAt stamp hota hai (10 baje upload = agle din 10 baje purge),
// aur ek scheduler har 15 min me expired files + references silently delete karta hai.
export const DOCUMENT_RETENTION_MS = 24 * 60 * 60 * 1000;
export const RETENTION_SWEEP_INTERVAL_MS = 15 * 60 * 1000;

export const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');
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

  touchedOrders.forEach(order => emitOrderUpdate(order));
}

let sweepTimer: ReturnType<typeof setInterval> | null = null;

export function startDocumentRetentionScheduler(): void {
  if (sweepTimer) return;
  purgeExpiredDocuments();
  sweepTimer = setInterval(purgeExpiredDocuments, RETENTION_SWEEP_INTERVAL_MS);
  if (typeof sweepTimer.unref === 'function') sweepTimer.unref();
}
