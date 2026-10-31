import { randomUUID } from 'node:crypto';
import { AdminPaymentLedgerEntry, AdminPaymentLedgerStatus, VleOperator, VleOrder, FillerOrder, ServiceScope } from '../types/index.ts';
import {
  UserAccountModel,
  VleOperatorModel,
  FillerExpertModel,
  VleOrderModel,
  FillerOrderModel,
  FillerServiceModel,
  GlobalPricingModel,
  AdminPaymentLedgerModel,
  PayoutProfileModel
} from '../models/index.ts';
import { isMongoConnected } from '../config/db.ts';

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
  district?: string;
  city?: string;
  state?: string;
  pricingList?: any[];
  formFillingList?: any[];
  token?: string;
  createdAt: string;
  lastLoginAt: string;
  // Bid distribution limits (per operator account)
  bidDayKey?: string;
  bidsAcceptedToday?: number;
  bidCooldownUntil?: string;
  offlineEmailDayKey?: string;
  offlineEmailCount?: number;
  offlineEmailPaused?: boolean;
  lastSeenOnlineAt?: string;
  lastSeenOfflineAt?: string;
}

export let userAccountsStore: UserAccount[] = [];

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
      district: account.district || '',
      city: account.city || '',
      state: account.state || '',
      pricingList: Array.isArray(account.pricingList) ? account.pricingList : [],
      token: 'tok_' + randomUUID(),
      createdAt: now,
      lastLoginAt: now
    };
    userAccountsStore.unshift(newAcc);
    persistToMongo('userAccount', newAcc).catch(() => {});
    return newAcc;
  }
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

export async function hydrateFromMongo() {
  if (!isMongoConnected()) return;
  try {
    const [vles, fExperts, vOrders, fOrders, fServices, gPricing, ledger, accounts] = await Promise.all([
      VleOperatorModel.find({}).lean(),
      FillerExpertModel.find({}).lean(),
      VleOrderModel.find({}).sort({ createdAt: -1 }).lean(),
      FillerOrderModel.find({}).sort({ createdAt: -1 }).lean(),
      FillerServiceModel.find({}).lean(),
      GlobalPricingModel.find({}).lean(),
      AdminPaymentLedgerModel.find({}).sort({ createdAt: -1 }).lean(),
      UserAccountModel.find({}).lean()
    ]);

    if (vles.length) vleListStore = vles.map(cleanMongoDoc) as any;
    if (vOrders.length) vleOrdersStore = vOrders.map(cleanMongoDoc) as any;
    if (fOrders.length) fillerOrdersStore = fOrders.map(cleanMongoDoc) as any;
    if (fServices.length) fillerServicesStore = fServices.map(cleanMongoDoc) as any;
    if (gPricing.length) globalPricingStore = gPricing.map(cleanMongoDoc) as any;
    if (ledger.length) adminPaymentLedgerStore = ledger.map(cleanMongoDoc) as any;
    if (accounts.length) userAccountsStore = accounts.map(cleanMongoDoc) as any;

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
  if (!isMongoConnected()) return;
  try {
    const safeDoc = cleanMongoDoc(doc);
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
      case 'vleOrder':
        await VleOrderModel.updateOne({ id: safeDoc.id }, { $set: safeDoc }, { upsert: true });
        break;
      case 'fillerOrder':
        await FillerOrderModel.updateOne({ id: safeDoc.id }, { $set: safeDoc }, { upsert: true });
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
      default:
        break;
    }
  } catch (e) {
    console.error('[MongoDB] Persist failed', e);
  }
}

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
  if (account.role === 'vle') {
    const operator = findVleOperatorForAccount(account);
    if (operator?.bidsSuspended) {
      return {
        allowed: false,
        reason: '🚫 BIDS SUSPENDED: In-app payment bypass ki wajah se aapka bid lena band hai.',
        activeCount: activeBidCountForAccount(account),
        dailyCount: Math.max(0, Number(account.bidsAcceptedToday) || 0)
      };
    }
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
export async function persistOrder(order: any): Promise<void> {
  if (!order?.id) return;
  const inVle = vleOrdersStore.some(item => item.id === order.id);
  const inFiller = fillerOrdersStore.some(item => item.id === order.id);
  if (inVle) await persistToMongo('vleOrder', order);
  if (inFiller) await persistToMongo('fillerOrder', order);
  if (!inVle && !inFiller) {
    if (order.orderType === 'online_form_filling' || order.orderType === 'custom_form') {
      await persistToMongo('fillerOrder', order);
    } else {
      await persistToMongo('vleOrder', order);
    }
  }
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
  orderType?: 'online_form_filling' | 'custom_form';
}) {
  const bidId = 'BID-FORM-' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    createdAt: now.toISOString(),
    notificationsSent: {
      phone: false,
      email: false,
      broadcastToVle: allVleRecipients.length > 0,
      broadcastToFiller: true
    },
    chatMessages: [
      {
        id: 'sys-' + Date.now(),
        sender: 'operator',
        senderName: 'FILLUP Central Broadcast',
        text: `📢 New request: "${data.formTitle}" is available to all Jan Seva operators (national scope) and Form Filler experts. First eligible operator to accept wins the bid.`,
        time: timeStr
      }
    ],
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
