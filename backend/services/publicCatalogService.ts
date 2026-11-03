import {
  fillerServicesStore,
  globalPricingStore,
  vleListStore,
  getDocumentScope,
  locationMatches
} from './storeService.ts';
import type { ServiceScope } from '../types/index.ts';

/**
 * Public catalogue for SEO landing pages.
 *
 * Only safe, non-personal fields are exposed here. Operator phone/email is
 * never returned to an anonymous visitor. The dashboard stores remain the
 * source of truth; this module simply groups the same services by name so a
 * single document gets one canonical public page.
 */

export interface PublicServiceOperator {
  id: string;
  name: string;
  city: string;
  district: string;
  state: string;
  role: 'vle' | 'filler';
  verified: boolean;
  complianceScore: number;
}

export interface PublicServiceFees {
  totalMin: number;
  totalMax: number;
  govtFeeMin: number;
  govtFeeMax: number;
  serviceFeeMin: number;
  serviceFeeMax: number;
}

export interface PublicServiceFaq {
  q: string;
  a: string;
  qHi: string;
  aHi: string;
}

export interface PublicService {
  slug: string;
  name: string;
  icon: string;
  scope: ServiceScope;
  description: string;
  requirements: string[];
  fees: PublicServiceFees;
  operatorCount: number;
  operatorCountVle: number;
  operatorCountFiller: number;
  states: string[];
  districts: string[];
  cities: string[];
  operators: PublicServiceOperator[];
  faqs: PublicServiceFaq[];
  updatedAt: string;
}

interface CatalogEntry {
  names: Map<string, number>;
  icon: string;
  scopes: Map<ServiceScope, number>;
  descriptions: string[];
  requirements: string[];
  prices: Array<{ total: number; govt: number; service: number }>;
  operators: Map<string, PublicServiceOperator>;
  states: Set<string>;
  districts: Set<string>;
  cities: Set<string>;
  updatedAt: string;
}

const CACHE_TTL_MS = 30_000;
let catalogCache: { at: number; services: PublicService[] } | null = null;

export function clearPublicCatalogCache() {
  catalogCache = null;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : String(value ?? '').trim();
}

function normalizeKey(value: unknown): string {
  return safeString(value)
    .normalize('NFKC')
    .toLocaleLowerCase('en-IN')
    .replace(/[^a-z0-9\u0900-\u097F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const DEVANAGARI_MAP: Record<string, string> = {
  'अ': 'a', 'आ': 'aa', 'इ': 'i', 'ई': 'ee', 'उ': 'u', 'ऊ': 'oo', 'ऋ': 'ri',
  'ए': 'e', 'ऐ': 'ai', 'ओ': 'o', 'औ': 'au', 'ं': 'n', 'ः': 'h', 'ँ': 'n',
  'क': 'ka', 'ख': 'kha', 'ग': 'ga', 'घ': 'gha', 'ङ': 'nga',
  'च': 'cha', 'छ': 'chha', 'ज': 'ja', 'झ': 'jha', 'ञ': 'nya',
  'ट': 'ta', 'ठ': 'tha', 'ड': 'da', 'ढ': 'dha', 'ण': 'na',
  'त': 'ta', 'थ': 'tha', 'द': 'da', 'ध': 'dha', 'न': 'na',
  'प': 'pa', 'फ': 'pha', 'ब': 'ba', 'भ': 'bha', 'म': 'ma',
  'य': 'ya', 'र': 'ra', 'ल': 'la', 'व': 'va', 'श': 'sha', 'ष': 'sha',
  'स': 'sa', 'ह': 'ha', 'ळ': 'la', 'क़': 'qa', 'ख़': 'kha', 'ग़': 'ga',
  'ज़': 'za', 'ड़': 'ra', 'ढ़': 'rha', 'फ़': 'fa',
  'ा': 'a', 'ि': 'i', 'ी': 'ee', 'ु': 'u', 'ू': 'oo', 'ृ': 'ri',
  'े': 'e', 'ै': 'ai', 'ो': 'o', 'ौ': 'au', 'ॉ': 'o', 'ॅ': 'e', '्': ''
};

function transliterateDevanagari(value: string): string {
  let result = '';
  for (const char of value) {
    result += DEVANAGARI_MAP[char] ?? char;
  }
  return result;
}

function shortHash(value: string): string {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).slice(0, 5);
}

export function slugifyServiceName(value: unknown): string {
  const transliterated = transliterateDevanagari(safeString(value));
  const slug = transliterated
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
  return slug || `service-${shortHash(safeString(value) || 'default')}`;
}

function money(value: unknown): number {
  const parsed = Number(String(value ?? '').replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed);
}

function splitRequirements(value: unknown): string[] {
  return safeString(value)
    .split(/[\n,;|]+/)
    .map(item => item.replace(/^(?:kagaz|documents?|required)\s*[:\-]\s*/i, '').trim())
    .filter(item => item.length >= 2 && item.length <= 120);
}

function createEntry(name: string): CatalogEntry {
  return {
    names: new Map(),
    icon: '📄',
    scopes: new Map(),
    descriptions: [],
    requirements: [],
    prices: [],
    operators: new Map(),
    states: new Set(),
    districts: new Set(),
    cities: new Set(),
    updatedAt: new Date().toISOString()
  };
}

function getEntry(map: Map<string, CatalogEntry>, name: string): CatalogEntry {
  const key = normalizeKey(name);
  const existing = map.get(key);
  if (existing) return existing;
  const created = createEntry(name);
  map.set(key, created);
  return created;
}

function addName(entry: CatalogEntry, name: string) {
  const clean = safeString(name);
  if (!clean) return;
  entry.names.set(clean, (entry.names.get(clean) || 0) + 1);
}

function addScope(entry: CatalogEntry, scope: ServiceScope | undefined, name: string) {
  const resolved = scope === 'district' || scope === 'national' || scope === 'online_form'
    ? scope
    : getDocumentScope(name);
  entry.scopes.set(resolved, (entry.scopes.get(resolved) || 0) + 1);
}

function addPrice(entry: CatalogEntry, totalValue: unknown, govtValue: unknown, serviceValue: unknown) {
  const govt = money(govtValue);
  let service = money(serviceValue);
  let total = money(totalValue);
  if (!total && (govt || service)) total = govt + service;
  if (!service && total > govt) service = total - govt;
  if (total <= 0 && govt <= 0 && service <= 0) return;
  entry.prices.push({ total: total || govt + service, govt, service });
}

function addOperator(
  entry: CatalogEntry,
  operator: {
    id?: string;
    name?: string;
    city?: string;
    district?: string;
    state?: string;
    role?: 'vle' | 'filler';
    complianceScore?: number;
  }
) {
  const name = safeString(operator.name);
  if (!name) return;
  const role: 'vle' | 'filler' = operator.role === 'filler' ? 'filler' : 'vle';
  const key = `${role}:${safeString(operator.id) || name}:${normalizeKey(operator.city)}`;
  if (entry.operators.has(key)) return;
  const city = safeString(operator.city);
  const district = safeString(operator.district);
  const state = safeString(operator.state);
  entry.operators.set(key, {
    id: safeString(operator.id) || key,
    name,
    city,
    district,
    state,
    role,
    verified: true,
    complianceScore: Math.max(0, Number(operator.complianceScore) || 0)
  });
  if (state) entry.states.add(state);
  if (district) entry.districts.add(district);
  if (city) entry.cities.add(city);
}

function addRequirement(entry: CatalogEntry, value: unknown) {
  for (const item of splitRequirements(value)) {
    if (!entry.requirements.some(existing => normalizeKey(existing) === normalizeKey(item))) {
      entry.requirements.push(item);
    }
  }
}

function addDescription(entry: CatalogEntry, value: unknown) {
  const clean = safeString(value);
  if (clean.length >= 20 && !entry.descriptions.includes(clean)) {
    entry.descriptions.push(clean.slice(0, 600));
  }
}

function buildEntries(): Map<string, CatalogEntry> {
  const entries = new Map<string, CatalogEntry>();

  // 1. Admin / global catalogue (base price list).
  for (const item of globalPricingStore) {
    const name = safeString(item.docName);
    if (!name) continue;
    const entry = getEntry(entries, name);
    addName(entry, name);
    // The global catalogue does not carry an explicit scope. Do not add an
    // inferred scope here, otherwise an exam form that is also present in the
    // global price list could override its explicit `online_form` scope.
    addPrice(entry, item.price, '', '');
    if (item.icon) entry.icon = item.icon;
  }

  // 2. Jan Seva Kendra operator pricing lists.
  for (const operator of vleListStore) {
    if (operator.role === 'filler') continue;
    for (const item of operator.pricingList || []) {
      const name = safeString(item.docName);
      if (!name) continue;
      const entry = getEntry(entries, name);
      addName(entry, name);
      addScope(entry, item.scope, name);
      addPrice(entry, item.price, item.govtFee, item.cscFee);
      addRequirement(entry, item.requirements);
      if (item.icon) entry.icon = item.icon;
      addOperator(entry, {
        id: operator.id,
        name: operator.centerName || operator.name,
        city: operator.city,
        district: operator.district,
        state: operator.state,
        role: 'vle',
        complianceScore: operator.complianceScore
      });
    }

    // 3. Online form filling services offered by Jan Seva Kendra.
    for (const item of operator.formFillingList || []) {
      const name = safeString(item.docName);
      if (!name) continue;
      const entry = getEntry(entries, name);
      addName(entry, name);
      addScope(entry, item.scope || 'online_form', name);
      addPrice(entry, item.price, item.govtFee, '');
      addRequirement(entry, item.requirements);
      if (item.icon) entry.icon = item.icon;
      addOperator(entry, {
        id: operator.id,
        name: operator.centerName || operator.name,
        city: operator.city,
        district: operator.district,
        state: operator.state,
        role: 'vle',
        complianceScore: operator.complianceScore
      });
    }
  }

  // 4. Form Filler experts' published forms.
  for (const service of fillerServicesStore) {
    const name = safeString(service.docName);
    if (!name) continue;
    const entry = getEntry(entries, name);
    addName(entry, name);
    addScope(entry, service.scope || getDocumentScope(name), name);
    addPrice(entry, service.price, service.govtFee, '');
    addRequirement(entry, service.requirements);
    addDescription(entry, service.description);
    if (service.icon) entry.icon = service.icon;
    addOperator(entry, {
      id: service.ownerId || service.id,
      name: service.expertName || service.ownerEmail || 'Form Filler Expert',
      city: service.ownerCity || '',
      district: service.ownerDistrict || '',
      state: service.ownerState || service.state || '',
      role: 'filler'
    });
  }

  return entries;
}

function pickName(entry: CatalogEntry): string {
  let best = '';
  let bestCount = -1;
  for (const [name, count] of entry.names.entries()) {
    if (count > bestCount || (count === bestCount && name.length > best.length)) {
      best = name;
      bestCount = count;
    }
  }
  return best;
}

const EXAM_FORM_KEYWORDS = [
  'neet', 'jee', 'exam', 'admission', 'entrance', 'counselling', 'counseling',
  'scholarship', 'application form', 'online form', 'admit card', 'result'
];

function pickScope(entry: CatalogEntry, name: string): ServiceScope {
  if (entry.scopes.size === 0) return getDocumentScope(name);
  if (entry.scopes.size === 1) {
    return Array.from(entry.scopes.keys())[0];
  }
  const normalized = normalizeKey(name);
  if (
    entry.scopes.has('online_form') &&
    EXAM_FORM_KEYWORDS.some(keyword => normalized.includes(keyword))
  ) {
    return 'online_form';
  }
  let best: ServiceScope = getDocumentScope(name);
  let bestCount = -1;
  for (const [scope, count] of entry.scopes.entries()) {
    if (count > bestCount) {
      best = scope;
      bestCount = count;
    }
  }
  return best;
}

function pickDescription(entry: CatalogEntry, name: string, scope: ServiceScope): string {
  if (entry.descriptions.length > 0) {
    return entry.descriptions.sort((a, b) => b.length - a.length)[0];
  }
  if (scope === 'online_form') {
    return `Apply online for ${name} with assistance from verified Jan Seva Kendra operators and form filling experts. Share your details, upload documents and track the application from your dashboard.`;
  }
  if (scope === 'district') {
    return `Apply online for ${name} through a verified Jan Seva Kendra operator in your city or district. Get document check, application submission and status updates in one place.`;
  }
  return `Apply online for ${name} through verified Jan Seva Kendra operators across India. Check the government fee, required documents and processing steps before submitting your request.`;
}

function buildFaqs(name: string, scope: ServiceScope, fees: PublicServiceFees): PublicServiceFaq[] {
  const feeEn = fees.totalMin === fees.totalMax
    ? `₹${fees.totalMin}`
    : `₹${fees.totalMin}–₹${fees.totalMax}`;
  const feeHi = fees.totalMin === fees.totalMax
    ? `₹${fees.totalMin}`
    : `₹${fees.totalMin}–₹${fees.totalMax}`;
  const scopeEn = scope === 'online_form'
    ? 'Jan Seva Kendra operators and form filling experts across India'
    : scope === 'district'
      ? 'a verified Jan Seva Kendra operator in the applicant’s city or district'
      : 'verified Jan Seva Kendra operators across India';
  const scopeHi = scope === 'online_form'
    ? 'पूरे भारत के जन सेवा केंद्र ऑपरेटर और फॉर्म भरने के विशेषज्ञ'
    : scope === 'district'
      ? 'आवेदक के शहर या जिले का सत्यापित जन सेवा केंद्र'
      : 'पूरे भारत के सत्यापित जन सेवा केंद्र';

  return [
    {
      q: `What is the fee for ${name}?`,
      a: `The total fee is approximately ${feeEn}, which includes the government fee and the operator service fee. The exact amount is confirmed after you select an operator and share your location.`,
      qHi: `${name} का शुल्क कितना है?`,
      aHi: `कुल शुल्क लगभग ${feeHi} है, जिसमें सरकारी शुल्क और ऑपरेटर का सेवा शुल्क शामिल है। सटीक राशि ऑपरेटर चुनने और स्थान की पुष्टि के बाद बताई जाती है।`
    },
    {
      q: `Which documents are required for ${name}?`,
      a: `Commonly required documents are listed on this page. The exact checklist can vary by state and applicant category, so the operator verifies it before submission.`,
      qHi: `${name} के लिए कौन से दस्तावेज़ चाहिए?`,
      aHi: `ज़रूरी दस्तावेज़ इस पेज पर दिए गए हैं। राज्य और आवेदक श्रेणी के अनुसार सूची बदल सकती है, इसलिए ऑपरेटर आवेदन से पहले दस्तावेज़ जाँचता है।`
    },
    {
      q: `Who processes the ${name} application?`,
      a: `The request is sent to ${scopeEn}. You can compare available operators, check fees and track the request from your dashboard after login.`,
      qHi: `${name} का आवेदन कौन प्रोसेस करता है?`,
      aHi: `आवेदन ${scopeHi} को भेजा जाता है। लॉगिन के बाद आप ऑपरेटर की फीस देख सकते हैं और अपने डैशबोर्ड से स्थिति ट्रैक कर सकते हैं।`
    }
  ];
}

function assembleServices(entries: Map<string, CatalogEntry>): PublicService[] {
  const sorted = Array.from(entries.values())
    .map(entry => ({ entry, name: pickName(entry) }))
    .filter(item => item.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  const usedSlugs = new Map<string, number>();
  const services: PublicService[] = [];

  for (const { entry, name } of sorted) {
    let slug = slugifyServiceName(name);
    const seen = usedSlugs.get(slug) || 0;
    if (seen > 0) {
      slug = `${slug}-${shortHash(name)}`;
    }
    usedSlugs.set(slugifyServiceName(name), seen + 1);

    const prices = entry.prices.length > 0
      ? entry.prices
      : [{ total: 0, govt: 0, service: 0 }];
    const totals = prices.map(item => item.total).filter(value => value > 0);
    const govtFees = prices.map(item => item.govt).filter(value => value > 0);
    const serviceFees = prices.map(item => item.service).filter(value => value > 0);
    const fees: PublicServiceFees = {
      totalMin: totals.length ? Math.min(...totals) : 0,
      totalMax: totals.length ? Math.max(...totals) : 0,
      govtFeeMin: govtFees.length ? Math.min(...govtFees) : 0,
      govtFeeMax: govtFees.length ? Math.max(...govtFees) : 0,
      serviceFeeMin: serviceFees.length ? Math.min(...serviceFees) : 0,
      serviceFeeMax: serviceFees.length ? Math.max(...serviceFees) : 0
    };
    const scope = pickScope(entry, name);
    const operators = Array.from(entry.operators.values())
      .sort((a, b) => b.complianceScore - a.complianceScore)
      .slice(0, 30);

    services.push({
      slug,
      name,
      icon: entry.icon || (scope === 'online_form' ? '📝' : '📄'),
      scope,
      description: pickDescription(entry, name, scope),
      requirements: entry.requirements.slice(0, 12),
      fees,
      operatorCount: entry.operators.size,
      operatorCountVle: operators.filter(operator => operator.role === 'vle').length,
      operatorCountFiller: operators.filter(operator => operator.role === 'filler').length,
      states: Array.from(entry.states).sort(),
      districts: Array.from(entry.districts).sort(),
      cities: Array.from(entry.cities).sort(),
      operators,
      faqs: buildFaqs(name, scope, fees),
      updatedAt: entry.updatedAt
    });
  }

  return services;
}

export function listPublicServices(force = false): PublicService[] {
  const now = Date.now();
  if (!force && catalogCache && now - catalogCache.at < CACHE_TTL_MS) {
    return catalogCache.services;
  }
  const services = assembleServices(buildEntries());
  catalogCache = { at: now, services };
  return services;
}

export function getPublicServiceBySlug(slug: string): PublicService | undefined {
  const clean = safeString(slug).toLowerCase();
  return listPublicServices().find(service => service.slug === clean);
}

export function getPublicServiceOperators(
  slug: string,
  filters: { state?: string; district?: string; city?: string } = {}
): PublicServiceOperator[] {
  const service = getPublicServiceBySlug(slug);
  if (!service) return [];
  let operators = service.operators;
  if (service.scope === 'district') {
    const district = safeString(filters.district);
    const city = safeString(filters.city);
    if (!district) return [];
    operators = operators.filter(operator => locationMatches(operator.district, district));
    if (city) {
      const cityOperators = operators.filter(operator => locationMatches(operator.city, city));
      if (cityOperators.length > 0) operators = cityOperators;
    }
  } else {
    const state = safeString(filters.state);
    if (state) {
      operators = operators.filter(operator => !operator.state || locationMatches(operator.state, state));
    }
  }
  return operators;
}

export function getSiteUrl(): string {
  const configured = safeString(process.env.APP_URL || process.env.VITE_APP_URL || process.env.RENDER_EXTERNAL_URL);
  return (configured || 'https://fillups-in.onrender.com').replace(/\/+$/, '');
}
