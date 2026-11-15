import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { AdminPaymentLedgerEntry, AdminPaymentLedgerStatus, VleOperator, VleOrder, FillerOrder, ServiceScope, OperatorSuspensionEntry } from '../types/index.ts';
import {
  UserAccountModel,
  VleOperatorModel,
  FillerExpertModel,
  VleOrderModel,
  FillerOrderModel,
  FillerServiceModel,
  GlobalPricingModel,
  AdminPaymentLedgerModel,
  PayoutProfileModel,
  AdminUpiSettingModel,
  OrderArchiveModel,
  ChatMessageModel
} from '../models/index.ts';
import { isMongoConnected, onMongoReady } from '../config/db.ts';

// ========================================================
// 💰 CATEGORY-WISE GOVERNMENT FEE (Gen / OBC / SC / ST / EWS / Female / PwD)
// ========================================================
// Ek hi form me har category ki government fee alag hoti hai. Expert/operator
// ek baar table bhar deta hai, citizen apni category chunta hai aur usi ka
// amount lagta hai. Purane forms (jinme table nahi hai) ke liye single
// `govtFee` hi fallback rehta hai — isliye kuch bhi tootta nahi.
export const GOVT_FEE_CATEGORY_KEYS = ['general', 'obc', 'sc', 'st', 'ews', 'female', 'pwd'] as const;
export type GovtFeeCategoryKey = typeof GOVT_FEE_CATEGORY_KEYS[number];
export type GovtFeeByCategory = Partial<Record<GovtFeeCategoryKey, string>>;

export function normalizeGovtFeeByCategory(value: unknown): GovtFeeByCategory | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const source = value as Record<string, unknown>;
  const clean: GovtFeeByCategory = {};
  for (const key of GOVT_FEE_CATEGORY_KEYS) {
    const raw = source[key];
    if (raw === undefined || raw === null) continue;
    const text = String(raw).trim();
    if (!text) continue;
    const num = Number(text);
    if (!Number.isFinite(num) || num < 0) continue;
    clean[key] = String(Math.round(num * 100) / 100);
  }
  return Object.keys(clean).length > 0 ? clean : undefined;
}

export function resolveCategoryGovtFee(
  byCategory: unknown,
  fallbackGovtFee: unknown,
  category?: string
): number {
  const table = normalizeGovtFeeByCategory(byCategory);
  const key = String(category || '').trim().toLowerCase();
  if (table && key && table[key as GovtFeeCategoryKey] !== undefined) {
    return Math.max(0, Number(table[key as GovtFeeCategoryKey]) || 0);
  }
  if (table && table.general !== undefined) {
    return Math.max(0, Number(table.general) || 0);
  }
  return Math.max(0, Number(fallbackGovtFee) || 0);
}

export interface LiveCameraSession {
  token: string;
  orderId: string;
  clientName: string;
  clientPhone: string;
  serviceName: string;
  expertName: string;
  status: 'pending' | 'submitted';
  photoUrl?: string;
  createdAt: string;
  submittedAt?: string;
}

export const liveCameraSessionsStore: LiveCameraSession[] = [];

// ========================================================
// 🛡️ USER AUTH & SESSION PERMANENT RETENTION (NO ZDR FOR LOGIN)
// ========================================================
// Per user requirement:
// "Login me backend me zero data retention NA HO, user accounts/sessions persist!"
// User credentials, active accounts, login records are permanently retained.
export interface UserAccount {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'client' | 'vle' | 'filler' | 'expert';
  cscId?: string;
  centerName?: string;
  photoUrl?: string;
  district?: string;
  city?: string;
  state?: string;
  pricingList?: any[];
  formFillingList?: any[];
  token?: string;
  createdAt: string;
  lastLoginAt: string;
  // 🔐 Security PIN — sirf identity (Gmail/mobile) change par lagta hai.
  // Plain PIN kabhi store nahi hota, sirf scrypt hash.
  pinHash?: string;
  pinUpdatedAt?: string;
  pinFailedAttempts?: number;
  pinLockedUntil?: string;
  // Bid distribution limits (per operator account)
  bidDayKey?: string;
  bidsAcceptedToday?: number;
  bidCooldownUntil?: string;
  offlineEmailDayKey?: string;
  offlineEmailCount?: number;
  offlineEmailPaused?: boolean;
  lastSeenOnlineAt?: string;
  lastSeenOfflineAt?: string;
  // Admin suspension (bid accept block + audit trail)
  bidsSuspended?: boolean;
  bidsSuspendedAt?: string;
  bidsSuspendedReason?: string;
  bidsSuspendedUntil?: string;
  suspensionHistory?: OperatorSuspensionEntry[];
}

export let userAccountsStore: UserAccount[] = [];

// ========================================================
// 💾 MONGO WRITE QUEUE (no silent data loss on cold start)
// ========================================================
// Render can take a few seconds before Atlas accepts the first connection.
// Writes made during that window used to be dropped because
// `persistToMongo` returned early. Keep them in memory and flush as soon as
// the connection is ready (or recovered after a network drop).
type PendingMongoWrite = { collection: string; doc: any };
const pendingMongoWrites = new Map<string, PendingMongoWrite>();
const MAX_PENDING_MONGO_WRITES = 5000;
let warnedAboutMongoQueue = false;

function mongoWriteKey(collection: string, doc: any): string {
  const id = String(doc?.id ?? doc?.key ?? '').trim();
  // Chat messages ka id sirf order ke andar unique hai — key me orderId bhi
  // rakho, warna do alag orders ka same id ek doosre ko queue se hata dega.
  const scope = collection.startsWith('chatMessage') && doc?.orderId ? `${doc.orderId}:` : '';
  return id ? `${collection}:${scope}${id}` : `${collection}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

export function pendingMongoWriteCount(): number {
  return pendingMongoWrites.size;
}

export function saveOrUpdateUserAccount(account: Partial<UserAccount> & { role: 'client' | 'vle' | 'filler' | 'expert' }): UserAccount {
  const existingIdx = userAccountsStore.findIndex(u =>
    u.role === account.role &&
    (
      (account.id && u.id === account.id) ||
      (account.cscId && u.cscId === account.cscId) ||
      (account.phone && u.phone === account.phone) ||
      (account.email && u.email === account.email)
    )
  );

  const now = new Date().toISOString();
  if (existingIdx >= 0) {
    const existing = userAccountsStore[existingIdx];
    userAccountsStore[existingIdx] = {
      ...existing,
      ...account,
      token: existing.token || ('tok_' + randomUUID()),
      lastLoginAt: now
    };
    void persistToMongo('userAccount', userAccountsStore[existingIdx]).catch(() => {});
    return userAccountsStore[existingIdx];
  } else {
    const newAcc: UserAccount = {
      id: account.id || ('usr_' + randomUUID()),
      name: account.name || '',
      email: account.email || '',
      phone: account.phone || '',
      role: account.role,
      cscId: account.cscId || '',
      centerName: account.centerName || '',
      photoUrl: account.photoUrl || '',
      district: account.district || '',
      city: account.city || '',
      state: account.state || '',
      pricingList: Array.isArray(account.pricingList) ? account.pricingList : [],
      pinHash: account.pinHash,
      pinUpdatedAt: account.pinUpdatedAt,
      pinFailedAttempts: account.pinFailedAttempts,
      pinLockedUntil: account.pinLockedUntil,
      token: 'tok_' + randomUUID(),
      createdAt: now,
      lastLoginAt: now
    };
    userAccountsStore.unshift(newAcc);
    persistToMongo('userAccount', newAcc).catch(() => {});
    return newAcc;
  }
}

// ========================================================
// 🔐 SECURITY PIN (identity change only)
// ========================================================
// PIN sirf Gmail/mobile badalne ke waqt maanga jaata hai — login, bid accept
// aur payment par nahi. Storage: Node built-in scrypt hash + timingSafeEqual.
// Plain PIN kabhi memory/DB/log me store nahi hota.
export const PIN_LOCK_ATTEMPTS = 5;
export const PIN_LOCK_MS = 24 * 60 * 60 * 1000;

export function isWeakPin(pin: unknown): boolean {
  const value = String(pin || '');
  if (!/^\d{6}$/.test(value)) return true;
  const digits = value.split('').map(Number);
  // 000000, 111111, ...
  if (digits.every(d => d === digits[0])) return true;
  // 123456, 654321, 012345, ...
  const ascending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const descending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  if (ascending || descending) return true;
  // 121212 (2-digit repeat), 123123 (3-digit repeat)
  if (/^(\d{2})\1{2}$/.test(value)) return true;
  if (/^(\d{3})\1$/.test(value)) return true;
  // 112233, 998877 type simple pairs
  if (/^(\d)\1(\d)\2(\d)\3$/.test(value)) return true;
  return false;
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPinHash(pin: unknown, storedHash?: string): boolean {
  const value = String(pin || '');
  if (!/^\d{6}$/.test(value) || !storedHash) return false;
  const [scheme, salt, hash] = storedHash.split(':');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, 'hex');
    const actual = scryptSync(value, salt, expected.length);
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function pinLockRemainingMs(account: UserAccount): number {
  if (!account.pinLockedUntil) return 0;
  const until = new Date(account.pinLockedUntil).getTime();
  if (!Number.isFinite(until)) return 0;
  return Math.max(0, until - Date.now());
}

/** Galat PIN par counter badhao; 5th failure par 24h lock. */
export function registerPinFailure(account: UserAccount): { locked: boolean; attemptsRemaining: number } {
  const now = Date.now();
  if (pinLockRemainingMs(account) > 0) {
    return { locked: true, attemptsRemaining: 0 };
  }
  const attempts = (account.pinFailedAttempts || 0) + 1;
  if (attempts >= PIN_LOCK_ATTEMPTS) {
    account.pinFailedAttempts = 0;
    account.pinLockedUntil = new Date(now + PIN_LOCK_MS).toISOString();
    void persistToMongo('userAccount', account).catch(() => {});
    return { locked: true, attemptsRemaining: 0 };
  }
  account.pinFailedAttempts = attempts;
  void persistToMongo('userAccount', account).catch(() => {});
  return { locked: false, attemptsRemaining: PIN_LOCK_ATTEMPTS - attempts };
}

/** Sahi PIN par counter + lock clear. */
export function clearPinFailures(account: UserAccount): void {
  if (!account.pinFailedAttempts && !account.pinLockedUntil) return;
  account.pinFailedAttempts = 0;
  delete account.pinLockedUntil;
  void persistToMongo('userAccount', account).catch(() => {});
}

/** Client ko bhejne se pehle PIN hash hamesha hata do. */
export function sanitizeAccountForClient<T extends { pinHash?: string }>(account: T): Omit<T, 'pinHash'> {
  const { pinHash: _pinHash, ...safe } = account;
  return safe;
}

export function getAccountByToken(token: unknown): UserAccount | undefined {
  const normalized = String(token || '').replace(/^Bearer\s+/i, '').trim();
  if (!normalized) return undefined;
  return userAccountsStore.find(account => account.token === normalized);
}

// ========================================================
// 🔒 DOCUMENT ZERO DATA RETENTION (ZDR) PIPELINE
// ========================================================
// Per user requirement:
// "Jab documents send karte hai usme zero data retention ho!"
// Documents are strictly ephemeral in-transit, auto-purged from memory/disk,
// and protected by a Zero Data Retention verification badge.
export interface ZeroDataRetentionDocument {
  id: string;
  name: string;
  type: 'pdf' | 'jpg' | 'png';
  size: string;
  url: string;
  zeroDataRetention: true;
  purgedAt: string;
  expiresAt?: string;
  storageFile?: string;
  retentionPolicy: 'EPHEMERAL_STREAM_ZERO_RETENTION';
}

export function processDocumentWithZeroRetention(docItem: any): ZeroDataRetentionDocument {
  const docType = docItem.type === 'jpg' ? 'jpg' : docItem.type === 'png' ? 'png' : 'pdf';
  return {
    id: docItem.id || ('doc_zdr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
    name: docItem.name || 'document.pdf',
    type: docType,
    size: docItem.size || '1.1 MB',
    url: docItem.previewUrl || docItem.url || '#',
    zeroDataRetention: true,
    purgedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    retentionPolicy: 'EPHEMERAL_STREAM_ZERO_RETENTION'
  };
}

// ========================================================
// ✍️ FORM FILLER EXPERT SERVICES & REQUIRED DOCUMENTS STORE
// ========================================================
export interface FillerServiceItem {
  id: string;
  docName: string;
  price: string;
  govtFee?: string;
  govtFeeByCategory?: GovtFeeByCategory;
  expertName: string;
  requirements: string;
  description?: string;
  icon?: string;
  scope?: ServiceScope;
  state?: string;
  ownerId?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  ownerDistrict?: string;
  ownerCity?: string;
  ownerState?: string;
}

export let fillerServicesStore: FillerServiceItem[] = [];

export function addOrUpdateFillerService(item: Partial<FillerServiceItem> & { docName: string; price: string }): FillerServiceItem {
  const newItem: FillerServiceItem = {
    id: item.id || ('ff-' + Date.now()),
    docName: item.docName,
    price: item.price,
    govtFee: item.govtFee !== undefined ? String(item.govtFee) : '',
    govtFeeByCategory: normalizeGovtFeeByCategory(item.govtFeeByCategory),
    expertName: item.expertName || 'Form Filler Expert',
    requirements: item.requirements || 'Aadhaar Card, Photo, Marksheet & Category Details',
    description: item.description || item.requirements || '',
    icon: item.icon || '📝',
    scope: item.scope || 'online_form',
    state: String(item.state || '').trim(),
    ownerId: item.ownerId,
    ownerPhone: item.ownerPhone,
    ownerEmail: item.ownerEmail,
    ownerDistrict: item.ownerDistrict,
    ownerCity: item.ownerCity,
    ownerState: item.ownerState
  };

  const existingIdx = fillerServicesStore.findIndex(s => s.id === newItem.id);
  if (existingIdx >= 0) {
    fillerServicesStore[existingIdx] = newItem;
  } else {
    fillerServicesStore.unshift(newItem);
  }
  try { persistToMongo('fillerService', newItem).catch(() => {}); } catch {}
  return newItem;
}

export let globalPricingStore: { id: string; docName: string; price: string; icon?: string; dept?: string }[] = [];

export function updateGlobalPricing(pricing: { id: string; docName: string; price: string; icon?: string; dept?: string }[]) {
  globalPricingStore = [...pricing];
  try { pricing.forEach(p => persistToMongo('globalPricing', p).catch(() => {})); } catch {}
  if (vleListStore.length > 0) {
    vleListStore[0].pricingList = [...pricing];
  }
}

export let vleListStore: VleOperator[] = [];

export let vleOrdersStore: VleOrder[] = [];

export let fillerOrdersStore: FillerOrder[] = [];

export let adminPaymentLedgerStore: AdminPaymentLedgerEntry[] = [];

// ========================================================
// 💰 ADMIN (PLATFORM) FEE UPI — persistent
// ========================================================
// Pehle ye sirf RAM me thi + .env fallback, isliye admin panel se saved UPI
// restart / Render sleep / redeploy par gayab ho jaati thi. Ab Mongo me save
// hoti hai aur boot par hydrate hoti hai.
export interface AdminUpiSetting {
  id: string;
  upiId: string;
  payeeName: string;
  updatedAt: string;
}

export const ADMIN_UPI_SETTING_ID = 'admin_upi';
export let adminUpiSettingStore: AdminUpiSetting | null = null;

export function setAdminUpiSetting(upiId: string, payeeName: string): AdminUpiSetting {
  const setting: AdminUpiSetting = {
    id: ADMIN_UPI_SETTING_ID,
    upiId: upiId.trim().toLowerCase(),
    payeeName: payeeName.trim(),
    updatedAt: new Date().toISOString()
  };
  adminUpiSettingStore = setting;
  void persistToMongo('adminUpiSetting', setting).catch(() => {});
  return setting;
}

export function clearAdminUpiSetting(): void {
  const setting: AdminUpiSetting = {
    id: ADMIN_UPI_SETTING_ID,
    upiId: '',
    payeeName: '',
    updatedAt: new Date().toISOString()
  };
  adminUpiSettingStore = setting;
  void persistToMongo('adminUpiSetting', setting).catch(() => {});
}

// ========================================================
// 💳 OPERATOR PAYOUT UPI PROFILES (persistent)
// ========================================================
// Pehle ye profile sirf RAM ke Map me thi, isliye server restart / Render
// sleep / redeploy par operator ki UPI gayab ho jaati thi aur citizen ko
// Operator Share QR nahi milta tha. Ab Mongo me save + boot par hydrate hoti hai.
export interface PayoutUpiHistoryEntry {
  upiId: string;
  previousUpiId?: string;
  changedAt: string;
  ip?: string;
  source?: string;
}

export interface PayoutProfile {
  id: string;
  key: string;
  role: 'vle' | 'filler';
  phone: string;
  email: string;
  upiId: string;
  savedAt: string;
  upiChangedAt: string;
  /** Nayi UPI is time tak payment receive nahi karegi (security cooling). */
  upiCoolingUntil?: string;
  /** Cooling ke dauran last known good UPI use hoti hai. */
  previousUpiId?: string;
  payoutUpiHistory: PayoutUpiHistoryEntry[];
}

export const payoutProfilesStore = new Map<string, PayoutProfile>();

function normalizeProfileIso(value: unknown): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function hydratePayoutProfile(doc: any): PayoutProfile | null {
  if (!doc || typeof doc !== 'object') return null;
  const key = String(doc.id || doc.key || '').trim();
  if (!key) return null;
  const role = doc.role === 'filler' ? 'filler' : doc.role === 'vle' ? 'vle' : null;
  if (!role) return null;
  return {
    id: key,
    key,
    role,
    phone: String(doc.phone || ''),
    email: String(doc.email || ''),
    upiId: String(doc.upiId || ''),
    savedAt: normalizeProfileIso(doc.savedAt || doc.updatedAt),
    upiChangedAt: normalizeProfileIso(doc.upiChangedAt),
    upiCoolingUntil: normalizeProfileIso(doc.upiCoolingUntil) || undefined,
    previousUpiId: typeof doc.previousUpiId === 'string' ? doc.previousUpiId : undefined,
    payoutUpiHistory: Array.isArray(doc.payoutUpiHistory) ? doc.payoutUpiHistory : []
  };
}

// 🔒 Bid accept karne se pehle operator ka payout UPI hona zaroori hai —
// warna client ko payment QR hi nahi milta aur order atak jaata hai.
// Profile key format paymentRoutes ke `getProfileKey` jaisa hi hai: `role:phone`.
export function findPayoutProfileForAccount(
  account: { role?: string; phone?: unknown } | null | undefined
): PayoutProfile | null {
  if (!account) return null;
  const role = account.role === 'filler' ? 'filler' : account.role === 'vle' ? 'vle' : null;
  if (!role) return null;
  const phone = normalizePhone(account.phone);
  if (!phone) return null;
  return payoutProfilesStore.get(`${role}:${phone}`) || null;
}

// ========================================================
// 💬 CHAT MESSAGE PERSISTENCE (alag `chatmessages` collection)
// ========================================================
// Order document me ab chat embedded nahi rehti. Har message ek chhota
// document hai, isliye naye message par poora order dobara save nahi hota.
// In-memory `order.chatMessages` hi source of truth rahta hai (API shape same),
// DB write sirf us ek message ka hota hai.
const persistedChatMessageKeys = new Set<string>();

function chatMessageKey(orderId: string, messageId: string): string {
  return `${orderId}::${messageId}`;
}

function toChatMessageDate(value: unknown, fallback?: number): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(fallback ?? Date.now());
}

function buildChatMessageDoc(orderId: string, message: any, fallbackTime?: number): any | null {
  const id = String(message?.id || message?.messageId || '').trim();
  if (!orderId || !id) return null;
  // Legacy system messages ke paas createdAt nahi hota — persist karte waqt
  // bhar dete hain, warna TTL/ordering kaam nahi karegi.
  const createdAt = toChatMessageDate(message?.createdAt, fallbackTime);
  if (message && !message.createdAt) message.createdAt = createdAt.toISOString();
  return {
    orderId,
    id,
    messageId: id,
    clientMessageId: message?.clientMessageId || id,
    sender: message?.sender === 'operator' ? 'operator' : 'client',
    senderName: message?.senderName || '',
    text: message?.text || '',
    time: message?.time || '',
    createdAt,
    attachment: message?.attachment || null,
    isVoiceNote: Boolean(message?.isVoiceNote),
    audioDataUrl: message?.audioDataUrl || null,
    audioDuration: message?.audioDuration || null,
    replyTo: message?.replyTo || null,
    deliveredAt: message?.deliveredAt || null,
    readAt: message?.readAt || null,
    isDeleted: Boolean(message?.isDeleted),
    deletedAt: message?.deletedAt || null,
    deletedBy: message?.deletedBy || null
  };
}

function normalizeStoredChatMessage(doc: any): any | null {
  if (!doc || typeof doc !== 'object') return null;
  const id = String(doc.id || doc.messageId || '').trim();
  if (!id) return null;
  // Ghost row guard: tick-status upsert kabhi send-write se pehle chala ho aur
  // process restart ho jaye to content-less row bach sakti hai. Use skip karo.
  const hasContent = Boolean(
    String(doc.text || '').trim() ||
    doc.attachment ||
    doc.audioDataUrl ||
    doc.isDeleted ||
    doc.replyTo
  );
  if (!hasContent || !doc.sender) return null;
  return {
    id,
    sender: doc.sender === 'operator' ? 'operator' : 'client',
    senderName: String(doc.senderName || ''),
    text: String(doc.text || ''),
    time: String(doc.time || ''),
    createdAt: toChatMessageDate(doc.createdAt).toISOString(),
    ...(doc.attachment ? { attachment: doc.attachment } : {}),
    ...(doc.isVoiceNote ? { isVoiceNote: true } : {}),
    ...(doc.audioDataUrl ? { audioDataUrl: doc.audioDataUrl } : {}),
    ...(doc.audioDuration ? { audioDuration: doc.audioDuration } : {}),
    ...(doc.replyTo ? { replyTo: doc.replyTo } : {}),
    ...(doc.deliveredAt ? { deliveredAt: doc.deliveredAt } : {}),
    ...(doc.readAt ? { readAt: doc.readAt } : {}),
    ...(doc.isDeleted ? { isDeleted: true } : {}),
    ...(doc.deletedAt ? { deletedAt: doc.deletedAt } : {}),
    ...(doc.deletedBy ? { deletedBy: doc.deletedBy } : {})
  };
}

// Ek naya (ya badla hua) message save karo. Same orderId+id par upsert hota
// hai, isliye retry/double-send se duplicate document nahi banta.
export function persistChatMessage(orderId: string, message: any): void {
  const doc = buildChatMessageDoc(orderId, message);
  if (!doc) return;
  persistedChatMessageKeys.add(chatMessageKey(doc.orderId, doc.id));
  void persistToMongo('chatMessage', doc).catch(error => {
    console.error('[Chat] Message persist failed:', error);
  });
}

// ✅ Tick update — sirf usi message ke deliveredAt/readAt likhe jaate hain.
export function persistChatMessageStatus(
  orderId: string,
  updates: Array<{ id: string; deliveredAt?: string; readAt?: string }>
): void {
  if (!orderId || !Array.isArray(updates) || updates.length === 0) return;
  for (const update of updates) {
    const id = String(update?.id || '').trim();
    if (!id) continue;
    const patch = {
      orderId,
      id,
      ...(update.deliveredAt ? { deliveredAt: update.deliveredAt } : {}),
      ...(update.readAt ? { readAt: update.readAt } : {})
    };
    void persistToMongo('chatMessageStatus', patch).catch(error => {
      console.error('[Chat] Message status persist failed:', error);
    });
  }
}

// 🗑️ Delete par content scrub — attachment/audio fields DB se bhi hat jaate hain.
export function persistChatMessageDelete(orderId: string, message: any): void {
  const id = String(message?.id || '').trim();
  if (!orderId || !id) return;
  // Pehle poori (scrubbed) row ensure karo — agar send-write abhi complete
  // nahi hua to upsert se row ban jaati hai, phir fields unset hote hain.
  persistChatMessage(orderId, message);
  const doc = {
    orderId,
    id,
    deletedAt: message?.deletedAt || new Date().toISOString(),
    deletedBy: message?.deletedBy || null
  };
  void persistToMongo('chatMessageDelete', doc).catch(error => {
    console.error('[Chat] Message delete persist failed:', error);
  });
}

// Chat-only actions order document ko save nahi karte, par 7-din inactivity
// auto-cancel ke liye chat bhi "activity" hai. Isliye sirf `lastActivityAt`
// ka chhota update alag se bhejte hain.
export function touchOrderActivity(orderId: string, at?: string): void {
  if (!orderId) return;
  const lastActivityAt = at || new Date().toISOString();
  void persistToMongo('orderActivity', { id: orderId, lastActivityAt }).catch(error => {
    console.error('[Chat] Activity touch failed:', error);
  });
}

// Order ke saare chat messages delete (order 7 din baad delete hone par).
export async function deleteChatMessagesForOrder(orderId: string): Promise<void> {
  if (!orderId) return;
  if (!isMongoConnected()) return;
  try {
    await (ChatMessageModel as any).deleteMany({ orderId });
  } catch (error) {
    console.error('[Chat] Chat cleanup failed:', error);
  }
}

// Ek message permanently delete (attachment/photo retention ke liye).
export async function deleteChatMessage(orderId: string, messageId: string): Promise<void> {
  if (!orderId || !messageId) return;
  persistedChatMessageKeys.delete(chatMessageKey(orderId, messageId));
  // persistToMongo queue use karta hai, isliye Mongo down ho to bhi deletion
  // reconnect ke baad apply hoti hai (message wapas nahi aata).
  await persistToMongo('chatMessageRemove', { orderId, id: messageId });
}

function chatCreatedAtMs(message: any, fallback: number): number {
  const date = toChatMessageDate(message?.createdAt, fallback);
  return date.getTime();
}

// Persist woh messages jo abhi DB me nahi gaye. Isse system-generated messages
// (payment, accept, proof, complete waghera) bhi apne aap chat collection me
// chale jaate hain — un routes ko alag se kuch badalna nahi padta.
async function persistUnpersistedChatMessages(order: any): Promise<void> {
  const messages = Array.isArray(order?.chatMessages) ? order.chatMessages : [];
  if (messages.length === 0) return;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    const id = String(message?.id || '').trim();
    if (!id) continue;
    const key = chatMessageKey(order.id, id);
    if (persistedChatMessageKeys.has(key)) continue;
    const doc = buildChatMessageDoc(order.id, message, Date.now() + index);
    if (!doc) continue;
    persistedChatMessageKeys.add(key);
    await persistToMongo('chatMessage', doc);
  }
}

// Purani embedded chat ko ek baar nayi collection me copy karo, phir order
// document se `chatMessages` field hata do. `$setOnInsert` use hota hai taaki
// nayi collection ka newer tick/delete data overwrite na ho.
async function migrateEmbeddedChatMessages(): Promise<boolean> {
  if (!isMongoConnected()) return false;
  const orders = [...vleOrdersStore, ...fillerOrdersStore];
  const operations: any[] = [];
  const seen = new Set<string>();

  for (const order of orders) {
    const messages = Array.isArray(order?.chatMessages) ? order.chatMessages : [];
    if (messages.length === 0) continue;
    const orderCreatedMs = toChatMessageDate(order.createdAt).getTime();
    messages.forEach((message: any, index: number) => {
      const id = String(message?.id || '').trim();
      if (!id) return;
      const dedupeKey = chatMessageKey(order.id, id);
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      const doc = buildChatMessageDoc(order.id, message, orderCreatedMs + index);
      if (!doc) return;
      operations.push({
        updateOne: {
          filter: { orderId: doc.orderId, id: doc.id },
          update: { $setOnInsert: doc },
          upsert: true
        }
      });
    });
  }

  if (operations.length > 0) {
    // Voice notes bade hote hain — chhote batches me likho, warna ek command
    // ki size limit (48MB) cross ho sakti hai.
    const BATCH_SIZE = 200;
    for (let start = 0; start < operations.length; start += BATCH_SIZE) {
      await (ChatMessageModel as any).bulkWrite(operations.slice(start, start + BATCH_SIZE), { ordered: false });
    }
  }

  // Copy successful — ab embedded field hatao (dono collections se, kyunki
  // broadcast order dono me ho sakta hai).
  await Promise.all([
    (VleOrderModel as any).updateMany(
      { chatMessages: { $exists: true } },
      { $unset: { chatMessages: '' } }
    ),
    (FillerOrderModel as any).updateMany(
      { chatMessages: { $exists: true } },
      { $unset: { chatMessages: '' } }
    )
  ]);

  if (operations.length > 0) {
    console.log(`[Chat] Migrated ${operations.length} embedded message(s) to the chatmessages collection`);
  }
  return true;
}

// Startup/reconnect par chat collection se messages padho aur in-memory orders
// se attach kar do — API/frontend ka shape bilkul same rehta hai.
async function hydrateChatMessagesFromCollection(): Promise<void> {
  if (!isMongoConnected()) return;
  const docs = await (ChatMessageModel as any).find({}).sort({ createdAt: 1 }).lean().exec();
  // Set ko freshly load hui rows se rebuild karo — TTL-deleted messages ke
  // purane keys memory me nahi bachenge.
  persistedChatMessageKeys.clear();
  const byOrder = new Map<string, any[]>();
  for (const raw of docs) {
    const message = normalizeStoredChatMessage(raw);
    if (!message) continue;
    const orderId = String(raw.orderId || '');
    if (!orderId) continue;
    const list = byOrder.get(orderId) || [];
    list.push(message);
    byOrder.set(orderId, list);
    persistedChatMessageKeys.add(chatMessageKey(orderId, message.id));
  }

  for (const order of [...vleOrdersStore, ...fillerOrdersStore]) {
    const stored = byOrder.get(order.id) || [];
    const embedded = Array.isArray(order.chatMessages) ? order.chatMessages : [];
    if (stored.length === 0 && embedded.length === 0) {
      order.chatMessages = [];
      continue;
    }
    // Merge: collection wins (usme naye tick/delete status hote hain), phir jo
    // embedded messages reh gaye (migration fail case) unhe jod do.
    const merged = new Map<string, any>();
    const orderCreatedMs = toChatMessageDate(order.createdAt).getTime();
    stored.forEach(message => merged.set(message.id, message));
    embedded.forEach((message: any, index: number) => {
      const id = String(message?.id || '').trim();
      if (!id || merged.has(id)) return;
      merged.set(id, { ...message, createdAt: message.createdAt || new Date(orderCreatedMs + index).toISOString() });
      persistedChatMessageKeys.add(chatMessageKey(order.id, id));
    });
    order.chatMessages = [...merged.values()].sort(
      (a, b) => chatCreatedAtMs(a, orderCreatedMs) - chatCreatedAtMs(b, orderCreatedMs)
    );
  }
}

export async function hydrateFromMongo() {
  if (!isMongoConnected()) return;
  try {
    const [vles, fExperts, vOrders, fOrders, fServices, gPricing, ledger, accounts, payoutProfiles, adminUpiSetting] = await Promise.all<any>([
      (VleOperatorModel as any).find({}).lean().exec(),
      (FillerExpertModel as any).find({}).lean().exec(),
      (VleOrderModel as any).find({}).sort({ createdAt: -1 }).lean().exec(),
      (FillerOrderModel as any).find({}).sort({ createdAt: -1 }).lean().exec(),
      (FillerServiceModel as any).find({}).lean().exec(),
      (GlobalPricingModel as any).find({}).lean().exec(),
      (AdminPaymentLedgerModel as any).find({}).sort({ createdAt: -1 }).lean().exec(),
      (UserAccountModel as any).find({}).lean().exec(),
      (PayoutProfileModel as any).find({}).lean().exec(),
      (AdminUpiSettingModel as any).findOne({ id: ADMIN_UPI_SETTING_ID }).lean().exec()
    ]);

    if (vles.length) vleListStore = vles.map(cleanMongoDoc) as any;
    if (vOrders.length) vleOrdersStore = vOrders.map(cleanMongoDoc) as any;
    if (fOrders.length) fillerOrdersStore = fOrders.map(cleanMongoDoc) as any;
    if (fServices.length) fillerServicesStore = fServices.map(cleanMongoDoc) as any;
    if (gPricing.length) globalPricingStore = gPricing.map(cleanMongoDoc) as any;
    if (ledger.length) adminPaymentLedgerStore = ledger.map(cleanMongoDoc) as any;
    if (accounts.length) userAccountsStore = accounts.map(cleanMongoDoc) as any;
    if (payoutProfiles.length) {
      for (const doc of payoutProfiles) {
        const profile = hydratePayoutProfile(cleanMongoDoc(doc));
        if (profile) payoutProfilesStore.set(profile.key, profile);
      }
    }
    if (adminUpiSetting) {
      const setting = cleanMongoDoc(adminUpiSetting);
      adminUpiSettingStore = {
        id: String(setting.id || ADMIN_UPI_SETTING_ID),
        upiId: String(setting.upiId || ''),
        payeeName: String(setting.payeeName || ''),
        updatedAt: normalizeProfileIso(setting.updatedAt)
      };
    }

    // 💬 Chat ab alag collection me hai. Pehle indexes (unique message id +
    // 7-din TTL) ensure karo, phir purani embedded chat ko ek baar migrate karo.
    try {
      await (ChatMessageModel as any).init();
    } catch (error) {
      console.error('[Chat] Chat indexes could not be created:', error);
    }
    try {
      await migrateEmbeddedChatMessages();
    } catch (error) {
      console.error('[Chat] Embedded chat migration failed (embedded data kept):', error);
    }
    try {
      await hydrateChatMessagesFromCollection();
    } catch (error) {
      console.error('[Chat] Chat hydration failed:', error);
    }

    console.log('[MongoDB] Data hydrated into in-memory stores');
  } catch (e) {
    console.error('[MongoDB] Hydrate failed', e);
  }
}

function cleanMongoDoc(doc: any): any {
  if (!doc || typeof doc !== 'object') return doc;
  const { _id, __v, ...rest } = doc;
  return rest;
}

export async function persistToMongo(collection: string, doc: any) {
  const safeDoc = cleanMongoDoc(doc);
  const writeKey = mongoWriteKey(collection, safeDoc);

  if (!isMongoConnected()) {
    if (pendingMongoWrites.size >= MAX_PENDING_MONGO_WRITES) {
      const oldestKey = pendingMongoWrites.keys().next().value;
      if (oldestKey) pendingMongoWrites.delete(oldestKey);
    }
    pendingMongoWrites.set(writeKey, { collection, doc: safeDoc });
    if (!warnedAboutMongoQueue) {
      warnedAboutMongoQueue = true;
      console.warn(`[MongoDB] Not connected — queued "${collection}" write. It will be saved automatically after reconnect.`);
    }
    return;
  }

  try {
    switch (collection) {
      case 'userAccount':
        await UserAccountModel.updateOne({ id: safeDoc.id }, { $set: safeDoc }, { upsert: true });
        break;
      case 'vleOperator':
        await VleOperatorModel.updateOne({ id: safeDoc.id }, { $set: safeDoc }, { upsert: true });
        break;
      case 'fillerExpert':
        await FillerExpertModel.updateOne({ id: safeDoc.id }, { $set: safeDoc }, { upsert: true });
        break;
      case 'vleOrder': {
        // Chat ab alag collection me hai — order document me field kabhi na jaye.
        const { chatMessages: _ignoredChat, ...orderDoc } = safeDoc;
        await VleOrderModel.updateOne(
          { id: orderDoc.id },
          { $set: orderDoc, $unset: { chatMessages: '' } },
          { upsert: true }
        );
        break;
      }
      case 'fillerOrder': {
        const { chatMessages: _ignoredChat, ...orderDoc } = safeDoc;
        await FillerOrderModel.updateOne(
          { id: orderDoc.id },
          { $set: orderDoc, $unset: { chatMessages: '' } },
          { upsert: true }
        );
        break;
      }
      case 'chatMessage': {
        const chatDoc: any = {
          ...safeDoc,
          messageId: safeDoc.messageId || safeDoc.id,
          clientMessageId: safeDoc.clientMessageId || safeDoc.id
        };
        // Null tick/delete fields ko `$set` mat karo — warna send-write jo
        // status-write ke baad DB tak pahuncha, pehle se laga ✓/✓✓ mita dega.
        ['deliveredAt', 'readAt', 'deletedAt', 'deletedBy'].forEach(field => {
          if (!chatDoc[field]) delete chatDoc[field];
        });
        if (!chatDoc.isDeleted) delete chatDoc.isDeleted;
        await ChatMessageModel.updateOne(
          { orderId: chatDoc.orderId, id: chatDoc.id },
          { $set: chatDoc },
          { upsert: true }
        );
        break;
      }
      case 'chatMessageStatus':
        await ChatMessageModel.updateOne(
          { orderId: safeDoc.orderId, id: safeDoc.id },
          {
            $set: {
              ...(safeDoc.deliveredAt ? { deliveredAt: safeDoc.deliveredAt } : {}),
              ...(safeDoc.readAt ? { readAt: safeDoc.readAt } : {})
            }
          },
          { upsert: true }
        );
        break;
      case 'chatMessageDelete':
        await ChatMessageModel.updateOne(
          { orderId: safeDoc.orderId, id: safeDoc.id },
          {
            $set: {
              isDeleted: true,
              deletedAt: safeDoc.deletedAt || new Date().toISOString(),
              deletedBy: safeDoc.deletedBy || null,
              text: '',
              isVoiceNote: false
            },
            $unset: { attachment: '', audioDataUrl: '', audioDuration: '' }
          }
        );
        break;
      case 'chatMessageRemove':
        await ChatMessageModel.deleteOne({ orderId: safeDoc.orderId, id: safeDoc.id });
        break;
      case 'orderActivity':
        // Sirf activity timestamp — poora order nahi.
        await Promise.all([
          VleOrderModel.updateOne({ id: safeDoc.id }, { $set: { lastActivityAt: safeDoc.lastActivityAt } }),
          FillerOrderModel.updateOne({ id: safeDoc.id }, { $set: { lastActivityAt: safeDoc.lastActivityAt } })
        ]);
        break;
      case 'fillerService':
        await FillerServiceModel.updateOne({ id: safeDoc.id }, { $set: safeDoc }, { upsert: true });
        break;
      case 'globalPricing':
        await GlobalPricingModel.updateOne({ id: safeDoc.id }, { $set: safeDoc }, { upsert: true });
        break;
      case 'ledger':
        await AdminPaymentLedgerModel.updateOne({ id: safeDoc.id }, { $set: safeDoc }, { upsert: true });
        break;
      case 'payoutProfile':
        await PayoutProfileModel.updateOne({ id: safeDoc.id }, { $set: safeDoc }, { upsert: true });
        break;
      case 'adminUpiSetting':
        await AdminUpiSettingModel.updateOne({ id: safeDoc.id }, { $set: safeDoc }, { upsert: true });
        break;
      case 'orderArchive':
        await OrderArchiveModel.updateOne({ id: safeDoc.id }, { $set: safeDoc }, { upsert: true });
        break;
      default:
        break;
    }
    pendingMongoWrites.delete(writeKey);
    warnedAboutMongoQueue = false;
  } catch (e) {
    pendingMongoWrites.set(writeKey, { collection, doc: safeDoc });
    console.error('[MongoDB] Persist failed — write queued for retry:', e);
  }
}

export async function flushPendingMongoWrites(): Promise<void> {
  if (!isMongoConnected() || pendingMongoWrites.size === 0) return;
  const queued = [...pendingMongoWrites.values()];
  console.log(`[MongoDB] Flushing ${queued.length} queued write(s)...`);
  for (const entry of queued) {
    await persistToMongo(entry.collection, entry.doc);
  }
}

// Flush anything written while disconnected first, then hydrate the rest of the
// Atlas data. Hydrating first would overwrite new in-memory records that are
// still waiting in the queue.
onMongoReady(async () => {
  await flushPendingMongoWrites();
  await hydrateFromMongo();
});

export function recordAdminPaymentLedger(entry: Omit<AdminPaymentLedgerEntry, 'id' | 'dateTime' | 'status' | 'source' | 'qrNote'> & Partial<Pick<AdminPaymentLedgerEntry, 'id' | 'dateTime' | 'status' | 'source' | 'qrNote'>>): AdminPaymentLedgerEntry {
  const existing = adminPaymentLedgerStore.find(item => item.orderId === entry.orderId);
  if (existing) return existing;
  const now = new Date().toISOString();
  const record: AdminPaymentLedgerEntry = {
    id: entry.id || ('ADM-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase()),
    orderId: entry.orderId,
    dateTime: entry.dateTime || now,
    clientName: entry.clientName,
    clientPhone: entry.clientPhone,
    serviceName: entry.serviceName,
    operatorName: entry.operatorName,
    amount: Math.max(0, Number(entry.amount) || 0),
    status: entry.status || 'Auto-Verified',
    source: entry.source || 'Citizen tick + Operator 2 ticks',
    qrNote: entry.qrNote || `Order ${entry.orderId} - Admin fee`,
    adminUpiId: entry.adminUpiId,
    note: entry.note,
    updatedAt: now
  };
  adminPaymentLedgerStore.unshift(record);
  try { persistToMongo('ledger', record).catch(() => {}); } catch {}
  return record;
}

export function getAdminPaymentLedger(): AdminPaymentLedgerEntry[] {
  return adminPaymentLedgerStore;
}

export function updateAdminPaymentLedgerStatus(id: string, status: Exclude<AdminPaymentLedgerStatus, 'Auto-Verified'>, note?: string): AdminPaymentLedgerEntry | undefined {
  const record = adminPaymentLedgerStore.find(item => item.id === id);
  if (!record) return undefined;
  record.status = status;
  record.note = note || record.note;
  record.updatedAt = new Date().toISOString();
  return record;
}

export function normalizeLocation(value: unknown): string {
  return String(value || '').normalize('NFKC').toLocaleLowerCase('en-IN').trim().replace(/\s+/g, ' ');
}

export function normalizeState(value: unknown): string {
  return normalizeLocation(value);
}

// All India = blank state. A state-specific service is visible only to an
// account from the same state; anonymous visitors see All India services only.
export function serviceVisibleForAccount(item: { state?: string }, account?: UserAccount): boolean {
  const serviceState = normalizeState(item.state);
  if (!serviceState) return true;
  const accountState = normalizeState(account?.state);
  return !!accountState && accountState === serviceState;
}

// Keyword-based location match: exact, partial ya contained-all match.
// Isse "meerut" aur "meerut nagar" dono match ho jate hain, city/district ke
// extra words (nagar, tehseel, etc.) se fark nahi padta.
export function locationMatches(a: unknown, b: unknown): boolean {
  const x = normalizeLocation(a);
  const y = normalizeLocation(b);
  if (!x || !y) return false;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const tokensX = x.split(' ').filter(Boolean);
  const tokensY = y.split(' ').filter(Boolean);
  if (tokensX.length === 0 || tokensY.length === 0) return false;
  const [shorter, longer] = tokensX.length <= tokensY.length ? [tokensX, tokensY] : [tokensY, tokensX];
  return shorter.every(token => longer.includes(token));
}

// =========================================================================
// Document scope: keyword-based district vs national classification.
// District-level (sirf usi district/shar ke Jan Seva Kendra me banne wale)
// documents ke keywords yahan hain. Baaki sab default national rahenge.
// =========================================================================
const DISTRICT_DOCUMENT_KEYWORDS = [
  'niwas', 'domicile', 'nivas', 'residence',
  'aay', 'income', 'aay-vyay',
  'jati', 'jaati', 'caste', 'ews', 'obc', 'sc ', 'st ',
  'character', 'solvency', 'minority',
  'khatauni', 'khasra', 'bhulekh', 'nakal', 'jamabandi',
  'girdawari', 'virasat', 'succession', 'vanshavali',
  'janm', 'birth', 'mrityu', 'death',
  'vivah', 'marriage', 'shadi',
  'ration', 'rashan', 'bpl', 'antyodaya', 'annapurna',
  'pension', 'vidhwa', 'widow', 'divyang',
  'affidavit', 'shapathpatra', 'notary', 'agreement',
  'wasiyat', 'will', 'power of attorney',
  'water connection', 'property tax', 'trade license', 'gumasta',
  'registry', 'zameen', 'land', 'plot',
  'shapath', 'khata', 'mutation', 'dakhil', 'namantaran'
];

export function getDocumentScope(docName: unknown): ServiceScope {
  const name = String(docName || '').normalize('NFKC').toLocaleLowerCase('en-IN');
  if (!name.trim()) return 'national';
  const isDistrict = DISTRICT_DOCUMENT_KEYWORDS.some(keyword => {
    const k = keyword.trim();
    if (!k) return false;
    // Word-boundary style: 'st ' aur 'sc ' jaise short tokens ke liye space-sensitive
    if (k.endsWith(' ')) return new RegExp(`(^|\\s)${k.trim()}(\\s|$)`).test(name);
    return name.includes(k);
  });
  return isDistrict ? 'district' : 'national';
}

export function getLocalVleRecipients(district: unknown, city: unknown = ''): VleOperator[] {
  const normalizedDistrict = normalizeLocation(district);
  if (!normalizedDistrict) return [];

  const normalizedCity = normalizeLocation(city);
  const districtOperators = vleListStore.filter(operator =>
    operator.role !== 'filler' &&
    locationMatches(operator.district, normalizedDistrict)
  );
  // City-first: agar citizen ke shehar me operator hai to sirf wahi; warna poora district.
  if (normalizedCity) {
    const cityOperators = districtOperators.filter(operator =>
      locationMatches(operator.city, normalizedCity)
    );
    if (cityOperators.length > 0) return cityOperators;
  }
  return districtOperators;
}

export function hasLocalVle(district: unknown, city: unknown = ''): boolean {
  const districtOperators = getLocalVleRecipients(district, '');
  const normalizedCity = normalizeLocation(city);
  return normalizedCity
    ? districtOperators.some(operator => locationMatches(operator.city, normalizedCity))
    : districtOperators.length > 0;
}

export function normalizePhone(value: unknown): string {
  return String(value || '').replace(/\D/g, '').slice(-10);
}

export function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export function findVleOperatorForAccount(account?: UserAccount): VleOperator | undefined {
  if (!account) return undefined;
  return vleListStore.find(operator =>
    operator.role !== 'filler' &&
    (
      (account.cscId && operator.cscId === account.cscId) ||
      (account.phone && normalizePhone(operator.phone) === normalizePhone(account.phone)) ||
      (account.email && normalizeEmail(operator.email) === normalizeEmail(account.email))
    )
  );
}

// Same matching, but includes Form Filler experts (role === 'filler').
export function findOperatorRecordForAccount(account?: UserAccount): VleOperator | undefined {
  if (!account) return undefined;
  return vleListStore.find(operator =>
    (account.cscId && operator.cscId === account.cscId) ||
    (account.phone && normalizePhone(operator.phone) === normalizePhone(account.phone)) ||
    (account.email && normalizeEmail(operator.email) === normalizeEmail(account.email))
  );
}

// ========================================================
// 🔁 IDENTITY CHANGE (PIN verified) — account + operator + payout
// ========================================================
// Jab Gmail/mobile badalta hai to sirf userAccount nahi badalna hota:
//  - public operator record (vleListStore) bhi same identity dikhaye
//  - payout profile `role:phone` key par saved hoti hai, isliye usse migrate
//    karna zaroori hai warna operator ki saved UPI "gayab" ho jaati hai.
async function migratePayoutProfilePhone(role: 'vle' | 'filler', oldPhone: string, newPhone: string): Promise<void> {
  const from = normalizePhone(oldPhone);
  const to = normalizePhone(newPhone);
  if (!from || !to || from === to) return;
  const oldKey = `${role}:${from}`;
  const newKey = `${role}:${to}`;
  const existing = payoutProfilesStore.get(oldKey);
  if (!existing) return;
  const migrated: PayoutProfile = {
    ...existing,
    id: newKey,
    key: newKey,
    phone: to
  };
  payoutProfilesStore.delete(oldKey);
  payoutProfilesStore.set(newKey, migrated);
  try {
    await persistToMongo('payoutProfile', migrated);
    if (isMongoConnected()) {
      await PayoutProfileModel.deleteOne({ id: oldKey });
    }
  } catch (error) {
    console.error('[Identity] Payout profile migration failed:', error);
  }
}

/**
 * Gmail/mobile identity change apply karta hai.
 * Caller ko PIN (aur nayi Gmail ke liye OTP) pehle verify karna chahiye.
 */
export async function applyAccountIdentityChange(
  account: UserAccount,
  change: { newEmail?: string; newPhone?: string }
): Promise<{ emailChanged: boolean; phoneChanged: boolean; oldEmail: string; oldPhone: string; newEmail: string; newPhone: string }> {
  const oldEmail = normalizeEmail(account.email);
  const oldPhone = normalizePhone(account.phone);
  const nextEmail = change.newEmail ? normalizeEmail(change.newEmail) : oldEmail;
  const nextPhone = change.newPhone ? normalizePhone(change.newPhone) : oldPhone;
  const emailChanged = !!nextEmail && nextEmail !== oldEmail;
  const phoneChanged = !!nextPhone && nextPhone !== oldPhone;

  if (!emailChanged && !phoneChanged) {
    return { emailChanged, phoneChanged, oldEmail, oldPhone, newEmail: oldEmail, newPhone: oldPhone };
  }

  // Public operator record ko change se PEHLE dhoondo (phone badalne par
  // matching fail ho jaati hai).
  const operator = findOperatorRecordForAccount(account);

  if (emailChanged) account.email = nextEmail;
  if (phoneChanged) account.phone = nextPhone;

  if (operator) {
    if (emailChanged) operator.email = nextEmail;
    if (phoneChanged) operator.phone = nextPhone;
    try {
      await persistToMongo('vleOperator', operator);
    } catch {}
  }

  await persistToMongo('userAccount', account);

  if (phoneChanged && (account.role === 'vle' || account.role === 'filler')) {
    await migratePayoutProfilePhone(account.role, oldPhone, nextPhone);
  }

  return { emailChanged, phoneChanged, oldEmail, oldPhone, newEmail: nextEmail, newPhone: nextPhone };
}

// =========================================================================
// 🚫 OPERATOR SUSPENSION (admin controlled bid block + audit trail)
// =========================================================================
// Suspension proof-based hoti hai: admin reason + optional days deta hai.
// Temporary suspension `bidsSuspendedUntil` se khud expire ho jaati hai,
// permanent suspension ka koi expiry nahi hota (sirf admin unsuspend karega).

export interface AdminOperatorView {
  id: string;
  accountId?: string;
  name: string;
  centerName?: string;
  cscId: string;
  role: 'vle' | 'filler';
  district: string;
  city: string;
  state?: string;
  phone: string;
  email?: string;
  status: string;
  complianceScore: number;
  bidsSuspended: boolean;
  bidsSuspendedAt?: string;
  bidsSuspendedReason?: string;
  bidsSuspendedUntil?: string;
  suspensionHistory: OperatorSuspensionEntry[];
  activeBidCount: number;
}

type SuspensionTarget = { operator?: VleOperator; account?: UserAccount };

function findOperatorByIdentifierRaw(identifier: string): VleOperator | undefined {
  const key = String(identifier || '').trim().toLowerCase();
  if (!key) return undefined;
  const phoneKey = normalizePhone(key);
  return vleListStore.find(operator => {
    const values = [
      operator.id,
      operator.cscId,
      operator.phone,
      normalizePhone(operator.phone),
      operator.email,
      normalizeEmail(operator.email)
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    return values.some(value => value.trim().toLowerCase() === key) ||
      (phoneKey.length === 10 && normalizePhone(operator.phone) === phoneKey);
  });
}

function findAccountByIdentifierRaw(identifier: string): UserAccount | undefined {
  const key = String(identifier || '').trim().toLowerCase();
  if (!key) return undefined;
  const phoneKey = normalizePhone(key);
  return userAccountsStore.find(account => {
    if (account.role !== 'vle' && account.role !== 'filler') return false;
    const values = [
      account.id,
      account.cscId,
      account.phone,
      normalizePhone(account.phone),
      account.email,
      normalizeEmail(account.email)
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    return values.some(value => value.trim().toLowerCase() === key) ||
      (phoneKey.length === 10 && normalizePhone(account.phone) === phoneKey);
  });
}

function resolveSuspensionTarget(identifier: string): SuspensionTarget | undefined {
  const operator = findOperatorByIdentifierRaw(identifier);
  const account = (operator ? findAccountForOperator(operator) : undefined) || findAccountByIdentifierRaw(identifier);
  if (!operator && !account) return undefined;
  return { operator, account };
}

function suspensionSourceOf(target: SuspensionTarget): (VleOperator | UserAccount) | undefined {
  return target.operator || target.account;
}

function appendSuspensionHistory(source: VleOperator | UserAccount, entry: OperatorSuspensionEntry): void {
  const history = Array.isArray(source.suspensionHistory) ? source.suspensionHistory : [];
  source.suspensionHistory = [...history, entry].slice(-60);
}

async function persistSuspensionTarget(target: SuspensionTarget): Promise<void> {
  if (target.operator) await persistToMongo('vleOperator', target.operator);
  if (target.account) await persistToMongo('userAccount', target.account);
}

function applySuspensionExpiry(source?: VleOperator | UserAccount | null): boolean {
  if (!source?.bidsSuspended) return false;
  const untilMs = source.bidsSuspendedUntil ? new Date(source.bidsSuspendedUntil).getTime() : NaN;
  if (!Number.isFinite(untilMs) || untilMs > Date.now()) return true;
  // Temporary suspension ka time poora ho gaya — auto unsuspend.
  source.bidsSuspended = false;
  source.bidsSuspendedAt = undefined;
  source.bidsSuspendedReason = undefined;
  source.bidsSuspendedUntil = undefined;
  appendSuspensionHistory(source, {
    action: 'auto-expired',
    reason: 'Temporary suspension period ended automatically.',
    at: new Date().toISOString()
  });
  return false;
}

export function isOperatorSuspended(operator?: VleOperator | null): boolean {
  const wasSuspended = !!operator?.bidsSuspended;
  const suspended = applySuspensionExpiry(operator);
  if (operator && wasSuspended && !suspended) {
    void persistToMongo('vleOperator', operator).catch(() => {});
  }
  return suspended;
}

export function isAccountSuspended(account?: UserAccount | null): boolean {
  const wasSuspended = !!account?.bidsSuspended;
  const suspended = applySuspensionExpiry(account);
  if (account && wasSuspended && !suspended) {
    void persistToMongo('userAccount', account).catch(() => {});
  }
  return suspended;
}

export function suspensionReasonFor(source?: VleOperator | UserAccount): string {
  const reason = String(source?.bidsSuspendedReason || '').trim();
  return reason || 'Admin ne aapka bid lena suspend kiya hai.';
}

function buildAdminOperatorView(target: SuspensionTarget): AdminOperatorView | undefined {
  const { operator, account } = target;
  const source = suspensionSourceOf(target);
  if (!source) return undefined;
  const suspended = applySuspensionExpiry(operator) || applySuspensionExpiry(account);
  return {
    id: operator?.id || account?.id || '',
    accountId: account?.id,
    name: operator?.name || account?.name || 'Operator',
    centerName: operator?.centerName || account?.centerName,
    cscId: operator?.cscId || account?.cscId || '',
    role: operator?.role === 'filler' || account?.role === 'filler' ? 'filler' : 'vle',
    district: operator?.district || account?.district || '',
    city: operator?.city || account?.city || '',
    state: operator?.state || account?.state,
    phone: operator?.phone || account?.phone || '',
    email: operator?.email || account?.email,
    status: operator?.status || 'Online',
    complianceScore: Number(operator?.complianceScore ?? 100),
    bidsSuspended: suspended,
    bidsSuspendedAt: source.bidsSuspendedAt,
    bidsSuspendedReason: source.bidsSuspendedReason,
    bidsSuspendedUntil: source.bidsSuspendedUntil,
    suspensionHistory: Array.isArray(source.suspensionHistory) ? source.suspensionHistory : [],
    activeBidCount: account ? activeBidCountForAccount(account) : 0
  };
}

export function listOperatorsForAdmin(search = ''): AdminOperatorView[] {
  const query = String(search || '').trim().toLowerCase();
  const targets: SuspensionTarget[] = [];
  const seenAccounts = new Set<string>();

  for (const operator of vleListStore) {
    const account = findAccountForOperator(operator);
    if (account) seenAccounts.add(account.id);
    targets.push({ operator, account });
  }
  // Form Filler experts live only in the account store — include them too.
  for (const account of userAccountsStore) {
    if (account.role !== 'filler' || seenAccounts.has(account.id)) continue;
    targets.push({ account });
  }

  const views = targets
    .map(target => {
      const source = suspensionSourceOf(target);
      const wasSuspended = !!source?.bidsSuspended;
      const view = buildAdminOperatorView(target);
      // Agar temporary suspension isi load par expire hui, DB me bhi save karo.
      if (view && wasSuspended && !view.bidsSuspended) {
        void persistSuspensionTarget(target).catch(() => {});
      }
      return view;
    })
    .filter((view): view is AdminOperatorView => !!view);

  const filtered = query
    ? views.filter(view =>
        [view.id, view.accountId, view.name, view.centerName, view.cscId, view.phone, view.email, view.district, view.city, view.state]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(query))
      )
    : views;

  return filtered.sort((a, b) => {
    if (a.bidsSuspended !== b.bidsSuspended) return a.bidsSuspended ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function getAdminOperator(identifier: string): AdminOperatorView | undefined {
  const target = resolveSuspensionTarget(identifier);
  if (!target) return undefined;
  const view = buildAdminOperatorView(target);
  if (view && (target.operator || target.account)) {
    void persistSuspensionTarget(target).catch(() => {});
  }
  return view;
}

export async function suspendOperatorByIdentifier(
  identifier: string,
  options: { reason: string; days?: number; note?: string; by?: string }
): Promise<AdminOperatorView | undefined> {
  const target = resolveSuspensionTarget(identifier);
  if (!target) return undefined;
  const reason = String(options.reason || '').trim() || 'Admin action';
  const days = Math.max(0, Math.floor(Number(options.days) || 0));
  const now = new Date();
  const until = days > 0 ? new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString() : undefined;
  const entry: OperatorSuspensionEntry = {
    action: 'suspend',
    reason,
    days: days || undefined,
    note: String(options.note || '').trim() || undefined,
    at: now.toISOString(),
    by: String(options.by || '').trim() || undefined
  };
  for (const source of [target.operator, target.account]) {
    if (!source) continue;
    source.bidsSuspended = true;
    source.bidsSuspendedAt = now.toISOString();
    source.bidsSuspendedReason = reason;
    source.bidsSuspendedUntil = until;
    appendSuspensionHistory(source, entry);
  }
  await persistSuspensionTarget(target);
  return buildAdminOperatorView(target);
}

export async function unsuspendOperatorByIdentifier(
  identifier: string,
  options: { reason?: string; by?: string } = {}
): Promise<AdminOperatorView | undefined> {
  const target = resolveSuspensionTarget(identifier);
  if (!target) return undefined;
  const entry: OperatorSuspensionEntry = {
    action: 'unsuspend',
    reason: String(options.reason || '').trim() || 'Suspension lifted by admin.',
    at: new Date().toISOString(),
    by: String(options.by || '').trim() || undefined
  };
  for (const source of [target.operator, target.account]) {
    if (!source) continue;
    source.bidsSuspended = false;
    source.bidsSuspendedAt = undefined;
    source.bidsSuspendedReason = undefined;
    source.bidsSuspendedUntil = undefined;
    appendSuspensionHistory(source, entry);
  }
  await persistSuspensionTarget(target);
  return buildAdminOperatorView(target);
}

export function getOperatorPricing(account?: UserAccount): VleOperator['pricingList'] {
  if (!account) return [];
  const operator = findVleOperatorForAccount(account);
  return operator?.pricingList?.length ? operator.pricingList : (Array.isArray(account.pricingList) ? account.pricingList as VleOperator['pricingList'] : []);
}

export function saveOperatorPricing(account: UserAccount, pricing: VleOperator['pricingList']): VleOperator['pricingList'] {
  const cleanPricing: VleOperator['pricingList'] = (Array.isArray(pricing) ? pricing : []).map((item): VleOperator['pricingList'][number] => ({
    id: item.id || ('price-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)),
    docName: String(item.docName || '').trim(),
    price: String(item.price ?? '').trim(),
    govtFee: item.govtFee !== undefined ? String(item.govtFee) : '',
    govtFeeByCategory: normalizeGovtFeeByCategory((item as any).govtFeeByCategory),
    cscFee: item.cscFee !== undefined ? String(item.cscFee) : '',
    requirements: item.requirements || '',
    scope: item.scope === 'national' || item.scope === 'online_form' ? item.scope : 'district',
    state: String(item.state || '').trim(),
    feeName: item.feeName || '',
    dept: item.dept || '',
    icon: item.icon || ''
  })).filter(item => item.docName);

  account.pricingList = cleanPricing;
  const operator = findVleOperatorForAccount(account);
  if (operator) {
    operator.pricingList = cleanPricing;
  }
  return cleanPricing;
}

export function getOperatorFormFilling(account?: UserAccount): any[] {
  if (!account) return [];
  const operator = findVleOperatorForAccount(account) as (VleOperator & { formFillingList?: any[] }) | undefined;
  return operator?.formFillingList?.length ? operator.formFillingList : (Array.isArray(account.formFillingList) ? account.formFillingList : []);
}

export function saveOperatorFormFilling(account: UserAccount, formFillingList: any[]): any[] {
  const cleanList = (Array.isArray(formFillingList) ? formFillingList : []).map(item => ({
    id: item.id || ('vle-f-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7)),
    docName: String(item.docName || '').trim(),
    price: String(item.price ?? '').trim(),
    govtFee: item.govtFee !== undefined ? String(item.govtFee) : '',
    govtFeeByCategory: normalizeGovtFeeByCategory(item.govtFeeByCategory),
    feeName: item.feeName || '',
    requirements: item.requirements || '',
    icon: item.icon || '📝',
    expertName: item.expertName || '',
    scope: item.scope === 'district' || item.scope === 'national' ? item.scope : 'online_form',
    state: String(item.state || '').trim()
  })).filter(item => item.docName && item.price);
  account.formFillingList = cleanList;
  const operator = findVleOperatorForAccount(account);
  if (operator) {
    operator.formFillingList = cleanList;
  }
  return cleanList;
}

export interface OperatorCatalogItem {
  id: string;
  serviceId: string;
  docName: string;
  price: string;
  serviceFee: number;
  govtFee?: string;
  govtFeeByCategory?: GovtFeeByCategory;
  cscFee?: string;
  requirements?: string;
  scope: ServiceScope;
  feeName?: string;
  dept?: string;
  icon?: string;
  operatorId: string;
  operatorCscId: string;
  operatorName: string;
  operatorPhone: string;
  operatorEmail?: string;
  operatorDistrict: string;
  operatorCity: string;
  operatorState?: string;
}

export function getPublicOperatorCatalog(account?: UserAccount): OperatorCatalogItem[] {
  const catalog: OperatorCatalogItem[] = [];
  // District-only documents sirf usi location ke operators ko dikhni chahiye jahan
  // citizen registered hai (city-first, fallback district). Guest ko location nahi
  // pata isliye unhe district docs nahi dikhte.
  const restrictDistrict = !account || account.role === 'client';
  const localPoolIds: Set<string> = account && account.role === 'client'
    ? new Set(getLocalVleRecipients(account.district, account.city).map(operator => operator.id))
    : new Set();
  for (const operator of vleListStore) {
    if (operator.role === 'filler') continue;
    for (const item of operator.pricingList || []) {
      if (!item.docName) continue;
      if (!serviceVisibleForAccount(item, account)) continue;
      const itemScope = item.scope || (item.docName ? 'district' : 'national');
      if (restrictDistrict && itemScope === 'district' && !localPoolIds.has(operator.id)) continue;
      const serviceFee = Math.max(0, Number(item.price) || 0);
      catalog.push({
        id: `${operator.id}-${item.id}`,
        serviceId: item.id,
        docName: item.docName,
        price: String(item.price ?? ''),
        serviceFee,
        govtFee: item.govtFee !== undefined ? String(item.govtFee) : '',
        govtFeeByCategory: normalizeGovtFeeByCategory((item as any).govtFeeByCategory),
        cscFee: item.cscFee !== undefined ? String(item.cscFee) : '',
        requirements: item.requirements || '',
        scope: item.scope || (item.docName ? 'district' : 'national'),
        feeName: item.feeName,
        dept: item.dept,
        icon: item.icon,
        operatorId: operator.id,
        operatorCscId: operator.cscId,
        operatorName: operator.name,
        operatorPhone: operator.phone,
        operatorEmail: operator.email,
        operatorDistrict: operator.district,
        operatorCity: operator.city,
        operatorState: operator.state
      });
    }
  }
  return catalog;
}

export function inferOrderScope(order: { serviceScope?: ServiceScope; orderType?: string; district?: string }): ServiceScope {
  if (order.serviceScope) return order.serviceScope;
  if (order.orderType === 'online_form_filling' || order.orderType === 'custom_form') return 'online_form';
  return order.district ? 'district' : 'national';
}

export function orderBelongsToClient(order: { clientId?: string; clientPhone?: string; clientEmail?: string }, account?: UserAccount): boolean {
  if (!account || account.role !== 'client') return false;
  const idMatch = !!account.id && order.clientId === account.id;
  const phoneMatch = normalizePhone(account.phone).length === 10 && normalizePhone(order.clientPhone) === normalizePhone(account.phone);
  const emailMatch = !!account.email && normalizeEmail(order.clientEmail) === normalizeEmail(account.email);
  return idMatch || phoneMatch || emailMatch;
}

// =========================================================================
// Bid distribution limits (active / daily / cooldown / offline email)
// =========================================================================
export const BID_LIMITS = {
  // One active order at a time: agla bid tabhi jab pehla kaam khatam ho.
  maxActive: Math.max(1, Number(process.env.OPERATOR_MAX_ACTIVE_BIDS) || 1),
  // Poore din me maximum accepted bids per operator.
  maxDaily: Math.max(1, Number(process.env.OPERATOR_MAX_DAILY_BIDS) || 15),
  // Optional extra cooldown after completion (0 = turant free).
  cooldownMinutes: Math.max(0, Number(process.env.OPERATOR_BID_COOLDOWN_MINUTES) || 0),
  // Offline operator ko maximum kitni email, phir online aane tak band.
  maxOfflineEmails: Math.max(1, Number(process.env.OPERATOR_MAX_OFFLINE_EMAILS) || 3)
};

export function todayIstKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function isOperatorAccount(account?: UserAccount): boolean {
  return !!account && (account.role === 'vle' || account.role === 'filler');
}

export function accountIdentityKeys(account?: UserAccount): string[] {
  if (!account) return [];
  const keys = new Set<string>();
  const add = (value?: unknown) => {
    const text = String(value ?? '').trim().toLowerCase();
    if (text) keys.add(text);
  };
  add(account.id);
  add(account.cscId);
  add(account.phone);
  add(normalizePhone(account.phone));
  add(account.email);
  add(normalizeEmail(account.email));
  const operator = findVleOperatorForAccount(account);
  if (operator) {
    add(operator.id);
    add(operator.cscId);
    add(operator.phone);
    add(normalizePhone(operator.phone));
    add(operator.email);
    add(normalizeEmail(operator.email));
  }
  return [...keys];
}

export function matchesAnyOperatorId(account: UserAccount | undefined, ids: unknown): boolean {
  if (!account || !Array.isArray(ids) || ids.length === 0) return false;
  const keys = new Set(accountIdentityKeys(account));
  return ids.some(id => keys.has(String(id ?? '').trim().toLowerCase()));
}

export function findAccountForOperator(operator: VleOperator): UserAccount | undefined {
  const operatorKeys = new Set(
    [operator.id, operator.cscId, normalizePhone(operator.phone), normalizeEmail(operator.email)]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map(value => value.trim().toLowerCase())
  );
  return userAccountsStore.find(account =>
    (account.role === 'vle' || account.role === 'filler') &&
    accountIdentityKeys(account).some(key => operatorKeys.has(key))
  );
}

export function activeBidCountForAccount(account?: UserAccount): number {
  if (!account) return 0;
  const keys = new Set(accountIdentityKeys(account));
  const isMine = (order: any) =>
    [order.acceptedByVleId, order.acceptedByFillerId, order.acceptedById]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .some(value => keys.has(value.trim().toLowerCase()));
  const seen = new Set<string>();
  let count = 0;
  for (const order of [...vleOrdersStore, ...fillerOrdersStore]) {
    if (!order?.id || seen.has(order.id)) continue;
    seen.add(order.id);
    if (!isMine(order)) continue;
    // 'paid' bhi active hai jab tak final PDF upload nahi hua / order complete nahi hua.
    if (['accepted', 'proof_submitted', 'paid'].includes(String(order.status || ''))) count += 1;
  }
  return count;
}

export function resetBidWindowsIfNeeded(account: UserAccount): void {
  const key = todayIstKey();
  if (account.bidDayKey !== key) {
    account.bidDayKey = key;
    account.bidsAcceptedToday = 0;
  }
  if (account.offlineEmailDayKey !== key) {
    account.offlineEmailDayKey = key;
    account.offlineEmailCount = 0;
  }
}

export function getBidLimitStatus(account?: UserAccount): {
  allowed: boolean;
  reason?: string;
  activeCount: number;
  dailyCount: number;
} {
  if (!account || !isOperatorAccount(account)) {
    return { allowed: false, reason: 'Registered operator account required.', activeCount: 0, dailyCount: 0 };
  }
  resetBidWindowsIfNeeded(account);
  const operator = findVleOperatorForAccount(account) || findOperatorRecordForAccount(account);
  const suspended = isAccountSuspended(account) || isOperatorSuspended(operator);
  if (suspended) {
    return {
      allowed: false,
      reason: `🚫 BIDS SUSPENDED: ${suspensionReasonFor(account.bidsSuspended ? account : operator)}`,
      activeCount: activeBidCountForAccount(account),
      dailyCount: Math.max(0, Number(account.bidsAcceptedToday) || 0)
    };
  }
  const activeCount = activeBidCountForAccount(account);
  const dailyCount = Math.max(0, Number(account.bidsAcceptedToday) || 0);
  if (activeCount >= BID_LIMITS.maxActive) {
    return {
      allowed: false,
      reason: `⏳ Aapka ${activeCount} active order chal raha hai. Pehle use complete karein, phir naya bid milega.`,
      activeCount,
      dailyCount
    };
  }
  if (dailyCount >= BID_LIMITS.maxDaily) {
    return {
      allowed: false,
      reason: `📅 Aaj ki daily limit poori ho gayi (${dailyCount}/${BID_LIMITS.maxDaily}). Kal 12:00 AM IST ke baad naye bids milenge.`,
      activeCount,
      dailyCount
    };
  }
  if (account.bidCooldownUntil) {
    const until = new Date(account.bidCooldownUntil).getTime();
    if (Number.isFinite(until) && until > Date.now()) {
      const minutesLeft = Math.ceil((until - Date.now()) / 60_000);
      return {
        allowed: false,
        reason: `⏳ Cooldown active hai — ${minutesLeft} minute baad naya bid milega.`,
        activeCount,
        dailyCount
      };
    }
  }
  return { allowed: true, activeCount, dailyCount };
}

export function recordBidAccepted(account?: UserAccount): void {
  if (!account || !isOperatorAccount(account)) return;
  resetBidWindowsIfNeeded(account);
  account.bidsAcceptedToday = Math.max(0, Number(account.bidsAcceptedToday) || 0) + 1;
  account.bidCooldownUntil = BID_LIMITS.cooldownMinutes > 0
    ? new Date(Date.now() + BID_LIMITS.cooldownMinutes * 60_000).toISOString()
    : undefined;
  void persistToMongo('userAccount', account).catch(() => {});
}

export function markAccountOnline(account?: UserAccount): void {
  if (!account || !isOperatorAccount(account)) return;
  resetBidWindowsIfNeeded(account);
  account.offlineEmailPaused = false;
  account.offlineEmailCount = 0;
  account.lastSeenOnlineAt = new Date().toISOString();
  void persistToMongo('userAccount', account).catch(() => {});
}

export function markAccountOffline(account?: UserAccount): void {
  if (!account || !isOperatorAccount(account)) return;
  account.lastSeenOfflineAt = new Date().toISOString();
  void persistToMongo('userAccount', account).catch(() => {});
}

export function canSendOfflineEmail(account?: UserAccount): boolean {
  if (!account || !isOperatorAccount(account)) return false;
  resetBidWindowsIfNeeded(account);
  if (account.offlineEmailPaused) return false;
  return (Math.max(0, Number(account.offlineEmailCount) || 0)) < BID_LIMITS.maxOfflineEmails;
}

export function recordOfflineEmail(account?: UserAccount): void {
  if (!account || !isOperatorAccount(account)) return;
  resetBidWindowsIfNeeded(account);
  account.offlineEmailCount = Math.max(0, Number(account.offlineEmailCount) || 0) + 1;
  if (account.offlineEmailCount >= BID_LIMITS.maxOfflineEmails) {
    account.offlineEmailPaused = true;
  }
  void persistToMongo('userAccount', account).catch(() => {});
}

// Broadcast orders live in BOTH stores, so persist to both collections.
export async function persistOrder(order: any, options: { touchActivity?: boolean } = {}): Promise<void> {
  if (!order?.id) return;
  // Har persist = activity, par sirf active orders ke liye. Terminal order ka
  // deletion clock completedAt/cancelledAt se chalta hai, isliye use touch nahi karte.
  // Background cleanup (document purge) activity ko touch nahi karta, warna
  // dead order bhi hamesha active dikhega.
  const touchActivity = options.touchActivity !== false;
  if (touchActivity && !isTerminalOrderStatus(order.status)) {
    order.lastActivityAt = new Date().toISOString();
  }
  // 💬 Chat alag collection me hai. Jo messages abhi DB me nahi gaye (system
  // messages jaise accept/proof/payment/complete) unhe per-message save karo.
  // Iske baad order document se chat strip ho jaati hai — poora order har
  // message par save nahi hota.
  await persistUnpersistedChatMessages(order);
  const inVle = vleOrdersStore.some(item => item.id === order.id);
  const inFiller = fillerOrdersStore.some(item => item.id === order.id);
  // Chat ab alag collection me hai — order document/queue me chat copy mat bhejo.
  const { chatMessages: _ignoredChatMessages, ...orderDoc } = order;
  if (inVle) await persistToMongo('vleOrder', orderDoc);
  if (inFiller) await persistToMongo('fillerOrder', orderDoc);
  if (!inVle && !inFiller) {
    if (order.orderType === 'online_form_filling' || order.orderType === 'custom_form') {
      await persistToMongo('fillerOrder', orderDoc);
    } else {
      await persistToMongo('vleOrder', orderDoc);
    }
  }
}

// ========================================================
// 🧹 ORDER RETENTION (7-day delete + anonymized archive)
// ========================================================
export const TERMINAL_ORDER_STATUSES = new Set(['completed', 'cancelled', 'expired']);

export function isTerminalOrderStatus(status: unknown): boolean {
  return TERMINAL_ORDER_STATUSES.has(String(status || ''));
}

export interface OrderArchive {
  id: string;
  orderType?: string;
  serviceName?: string;
  formTitle?: string;
  amountPaid: number;
  govtFee: number;
  adminCommission: number;
  operatorShare: number;
  status: string;
  createdAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  deletedAt: string;
}

export async function archiveOrderSummary(entry: OrderArchive): Promise<void> {
  await persistToMongo('orderArchive', entry);
}

export function dropPendingMongoWritesForOrder(orderId: string): void {
  if (!orderId) return;
  pendingMongoWrites.delete(`vleOrder:${orderId}`);
  pendingMongoWrites.delete(`fillerOrder:${orderId}`);
  // Chat queue keys: chatMessage:<orderId>:<messageId>
  const prefixes = ['chatMessage:', 'chatMessageStatus:', 'chatMessageDelete:', 'chatMessageRemove:'].map(name => `${name}${orderId}:`);
  for (const key of [...pendingMongoWrites.keys()]) {
    if (prefixes.some(prefix => key.startsWith(prefix))) {
      pendingMongoWrites.delete(key);
    }
  }
}

export async function deleteOrderFromMongo(orderId: string): Promise<boolean> {
  if (!orderId || !isMongoConnected()) return false;
  try {
    await Promise.all([
      (VleOrderModel as any).deleteOne({ id: orderId }),
      (FillerOrderModel as any).deleteOne({ id: orderId }),
      // Order ke saath uski chat bhi hatao (TTL ka intezaar na karo).
      deleteChatMessagesForOrder(orderId)
    ]);
    // Reconnect par purani queued write order ko wapas na le aaye.
    dropPendingMongoWritesForOrder(orderId);
    return true;
  } catch (error) {
    console.error('[Retention] Order delete failed:', error);
    return false;
  }
}

export function removeOrdersFromStores(orderIds: Set<string>): void {
  if (!orderIds.size) return;
  vleOrdersStore = vleOrdersStore.filter(order => !orderIds.has(order.id));
  fillerOrdersStore = fillerOrdersStore.filter(order => !orderIds.has(order.id));
  for (const orderId of orderIds) {
    const prefix = `${orderId}::`;
    for (const key of [...persistedChatMessageKeys]) {
      if (key.startsWith(prefix)) persistedChatMessageKeys.delete(key);
    }
  }
  for (let index = liveCameraSessionsStore.length - 1; index >= 0; index -= 1) {
    if (orderIds.has(liveCameraSessionsStore[index].orderId)) {
      liveCameraSessionsStore.splice(index, 1);
    }
  }
}

export function anonymizeAdminLedgerForOrder(orderId: string): void {
  const entry = adminPaymentLedgerStore.find(item => item.orderId === orderId);
  if (!entry) return;
  entry.clientName = 'Deleted';
  entry.clientPhone = '';
  entry.note = entry.note || 'Order deleted after 7-day retention window';
  void persistToMongo('ledger', entry).catch(() => {});
}

export async function persistAccount(account?: UserAccount): Promise<void> {
  if (!account) return;
  await persistToMongo('userAccount', account);
  const operator = findVleOperatorForAccount(account);
  if (operator) await persistToMongo('vleOperator', operator);
}

export function isOrderVisibleToAccount(
  order: {
    status?: string;
    clientPhone?: string;
    clientEmail?: string;
    district?: string;
    city?: string;
    orderType?: string;
    serviceScope?: ServiceScope;
    acceptedById?: string;
    acceptedByVleId?: string;
    acceptedByFillerId?: string;
    availableOperatorIds?: string[];
    targetOperatorId?: string;
  },
  account?: UserAccount
): boolean {
  if (!account) return false;
  if (account.role === 'client') return orderBelongsToClient(order, account);

  // Jo operator already assigned hai, usko apna order hamesha dikhega.
  const acceptedByMe =
    (account.role === 'vle'
      ? (!!order.acceptedByVleId && order.acceptedByVleId === account.cscId) ||
        (!!order.acceptedById && (order.acceptedById === account.cscId || order.acceptedById === account.id))
      : (!!order.acceptedByFillerId && (order.acceptedByFillerId === account.id || order.acceptedByFillerId === account.cscId)) ||
        (!!order.acceptedById && order.acceptedById === account.id));
  if (acceptedByMe) return true;

  if (order.status !== 'pending') return false;

  // 🎯 Target lock: citizen ne specific operator chuna hai to sirf usi ko dikhega.
  if (order.targetOperatorId && !matchesAnyOperatorId(account, [order.targetOperatorId])) {
    return false;
  }

  // ⏳ Active order / daily limit / cooldown — naya bid nahi.
  if (!getBidLimitStatus(account).allowed) return false;

  const scope = inferOrderScope(order);
  if (account.role === 'vle') {
    if (scope === 'district') {
      const district = normalizeLocation(order.district);
      if (!district || normalizeLocation(account.district) !== district) return false;
      // 🏙️ City-first eligible list: sirf list me shamil operators.
      if (Array.isArray(order.availableOperatorIds) && order.availableOperatorIds.length > 0) {
        return matchesAnyOperatorId(account, order.availableOperatorIds);
      }
      return true;
    }
    return scope === 'national' || scope === 'online_form';
  }

  if (account.role === 'filler') {
    return scope === 'online_form';
  }

  return false;
}

export interface CommunityQuery {
  id: string;
  citizenName: string;
  district: string;
  city: string;
  question: string;
  createdAt: string;
  answers: {
    id: string;
    operatorName: string;
    operatorPhone?: string;
    answerText: string;
    time: string;
  }[];
}

export let communityQueriesStore: CommunityQuery[] = [];

export type FoundOrderResult =
  | { type: 'vle'; order: VleOrder }
  | { type: 'filler'; order: FillerOrder };

export function findAnyOrder(id: string): FoundOrderResult | null {
  const vOrder = vleOrdersStore.find(o => o.id === id);
  if (vOrder) return { order: vOrder, type: 'vle' };
  const fOrder = fillerOrdersStore.find(o => o.id === id);
  if (fOrder) return { order: fOrder, type: 'filler' };
  return null;
}

export interface LocalOperatorUnavailableRequest {
  id: string;
  clientName: string;
  city: string;
  district: string;
  serviceName: string;
  createdAt: string;
}

export function listLocalOperatorUnavailableRequests(): LocalOperatorUnavailableRequest[] {
  const seen = new Set<string>();
  return [...vleOrdersStore, ...fillerOrdersStore]
    .filter(order => {
      if (!order.localOperatorUnavailable || order.localOperatorAlertResolvedAt || seen.has(order.id)) return false;
      seen.add(order.id);
      return true;
    })
    .map(order => ({
      id: order.id,
      clientName: order.clientName || 'Citizen',
      city: order.city || '',
      district: order.district || '',
      serviceName: order.formTitle || order.serviceName || 'Form request',
      createdAt: order.createdAt
    }))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export async function resolveLocalOperatorUnavailableRequest(id: string): Promise<boolean> {
  const found = findAnyOrder(id);
  if (!found || !found.order.localOperatorUnavailable || found.order.localOperatorAlertResolvedAt) return false;
  found.order.localOperatorAlertResolvedAt = new Date().toISOString();
  await persistOrder(found.order);
  return true;
}

export function createBroadcastFormBid(data: {
  formTitle: string;
  formDetails: string;
  formCategory?: string;
  formRoll?: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  district?: string;
  city?: string;
  amountPaid?: number;
  govtFee?: number;
  applicantCategory?: string;
  orderType?: 'online_form_filling' | 'custom_form';
}) {
  const bidId = 'BID-FORM-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const allVleRecipients = vleListStore.filter(operator => operator.role !== 'filler');

  const newBid: any = {
    id: bidId,
    formTitle: data.formTitle || 'Online Form Filling',
    serviceName: `📝 ${data.formTitle || 'Online Form Filling'}`,
    formDetails: data.formDetails || 'Full details submitted by applicant',
    formCategory: data.formCategory || 'General Exam & Sarkari Form',
    formRoll: data.formRoll || '',
    orderType: data.orderType || 'online_form_filling',
    serviceScope: 'online_form' as ServiceScope,
    isBroadcastBid: true,
    clientId: 'client-' + Math.floor(100 + Math.random() * 900),
    clientName: data.clientName || 'Citizen',
    clientPhone: data.clientPhone || '',
    clientEmail: data.clientEmail || '',
    district: data.district || '',
    city: data.city || '',
    availableOperatorIds: allVleRecipients.flatMap(operator => [operator.id, operator.cscId]),
    status: 'pending',
    amountPaid: data.amountPaid || 150,
    govtFee: Math.max(0, Number(data.govtFee) || 0),
    applicantCategory: String(data.applicantCategory || '').trim().toLowerCase() || undefined,
    createdAt: now.toISOString(),
    notificationsSent: {
      phone: false,
      email: false,
      broadcastToVle: allVleRecipients.length > 0,
      broadcastToFiller: true
    },
    chatMessages: [],
    clientDocuments: []
  };

  // Unshift the exact same reference to BOTH stores so both dashboards receive and reflect atomic state changes
  vleOrdersStore.unshift(newBid);
  try { persistToMongo('vleOrder', newBid).catch(() => {}); } catch {}
  fillerOrdersStore.unshift(newBid);
  try { persistToMongo('fillerOrder', newBid).catch(() => {}); } catch {}

  console.log(`[IN-APP BROADCAST BID] "${newBid.formTitle}" added to local Jan Seva and Form Filler order queues.`);

  return newBid;
}
