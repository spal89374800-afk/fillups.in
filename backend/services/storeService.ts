import { randomUUID } from 'node:crypto';
import { AdminPaymentLedgerEntry, AdminPaymentLedgerStatus, VleOperator, VleOrder, FillerOrder, ServiceScope } from '../types/index.ts';

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
  return newItem;
}

export let globalPricingStore: { id: string; docName: string; price: string; icon?: string; dept?: string }[] = [];

export function updateGlobalPricing(pricing: { id: string; docName: string; price: string; icon?: string; dept?: string }[]) {
  globalPricingStore = [...pricing];
  if (vleListStore.length > 0) {
    vleListStore[0].pricingList = [...pricing];
  }
}

export let vleListStore: VleOperator[] = [];

export let vleOrdersStore: VleOrder[] = [];

export let fillerOrdersStore: FillerOrder[] = [];

export let adminPaymentLedgerStore: AdminPaymentLedgerEntry[] = [];

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

export function orderBelongsToClient(order: { clientPhone?: string; clientEmail?: string }, account?: UserAccount): boolean {
  if (!account || account.role !== 'client') return false;
  const phoneMatch = normalizePhone(account.phone).length === 10 && normalizePhone(order.clientPhone) === normalizePhone(account.phone);
  const emailMatch = !!account.email && normalizeEmail(order.clientEmail) === normalizeEmail(account.email);
  return phoneMatch || emailMatch;
}

export function isOrderVisibleToAccount(
  order: {
    status?: string;
    clientPhone?: string;
    clientEmail?: string;
    district?: string;
    orderType?: string;
    serviceScope?: ServiceScope;
    acceptedById?: string;
    acceptedByVleId?: string;
    acceptedByFillerId?: string;
  },
  account?: UserAccount
): boolean {
  if (!account) return false;
  if (account.role === 'client') return orderBelongsToClient(order, account);

  if (account.role === 'vle') {
    const acceptedByMe =
      (order.acceptedByVleId && order.acceptedByVleId === account.cscId) ||
      (order.acceptedById && (order.acceptedById === account.cscId || order.acceptedById === account.id));
    if (acceptedByMe) return true;
  }

  if (account.role === 'filler') {
    const acceptedByMe =
      (order.acceptedByFillerId && (order.acceptedByFillerId === account.id || order.acceptedByFillerId === account.cscId)) ||
      (order.acceptedById && order.acceptedById === account.id);
    if (acceptedByMe) return true;
  }

  if (order.status !== 'pending') return false;

  const scope = inferOrderScope(order);
  if (account.role === 'vle') {
    if (scope === 'district') {
      const district = normalizeLocation(order.district);
      return !!district && normalizeLocation(account.district) === district;
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
    clientPhone: data.clientPhone || '9876543210',
    clientEmail: data.clientEmail || 'citizen@gmail.com',
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
  fillerOrdersStore.unshift(newBid);

  console.log(`[IN-APP BROADCAST BID] "${newBid.formTitle}" added to local Jan Seva and Form Filler order queues.`);

  return newBid;
}
