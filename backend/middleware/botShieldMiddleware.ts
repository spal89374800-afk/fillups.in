import { Request, Response, NextFunction } from 'express';
import fs from 'node:fs';
import path from 'node:path';

// ========================================================
// 🛡️ BOT SHIELD & ATTACK LOGGER
// ========================================================
// Cloudflare ke saath do-layer protection:
//   Layer 1 (Cloudflare) — WAF, country rule, Bot Fight Mode, Turnstile
//   Layer 2 (ye file)    — app level bot scoring, IP blocklist, attack log
//
// Ye middleware HAR request pe chalta hai (body parse se PEHLE), taaki
// bot ka bada payload parse hi na ho aur memory waste na ho.
//
// Overhead: ~0.05-0.2ms per request (string ops + regex). Users ko pata nahi chalta.

export type SecurityVerdict = 'ALLOWED' | 'SUSPICIOUS' | 'BLOCKED';

export interface SecurityEvent {
  id: number;
  time: string;
  ip: string;
  country: string;
  cfRay: string;
  viaCloudflare: boolean;
  method: string;
  path: string;
  status: number;
  score: number;
  verdict: SecurityVerdict;
  reasons: string[];
  userAgent: string;
  referer: string;
}

export interface ClientNetworkInfo {
  ip: string;
  country: string;
  cfRay: string;
  viaCloudflare: boolean;
}

// ── Config ────────────────────────────────────────────────────────────────
const MAX_MEMORY_EVENTS = 2000;
const MAX_DISK_BYTES = 5 * 1024 * 1024;
const MAX_DISK_FILES = 3;

const LOG_DIR = path.resolve(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'security-events.jsonl');
const BLOCKLIST_FILE = path.join(LOG_DIR, 'blocked-ips.json');

function readNumberEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Score >= is value par request BLOCK. Default 70.
const BLOCK_SCORE = readNumberEnv('BOT_SHIELD_BLOCK_SCORE', 70);
// Score >= is value par request SUSPICIOUS (allow + log).
const SUSPICIOUS_SCORE = readNumberEnv('BOT_SHIELD_SUSPICIOUS_SCORE', 40);
// Allowed countries (comma separated). Country CF header se aata hai.
const ALLOWED_COUNTRIES = (process.env.BOT_SHIELD_ALLOWED_COUNTRIES || 'IN')
  .split(',')
  .map(code => code.trim().toUpperCase())
  .filter(Boolean);

// ── Local development trust ───────────────────────────────────────────────
// VS Code ka "Simple Browser" (Electron UA), Postman, curl — sab localhost se
// aate hain aur ye legit dev tools hain. Production me loopback request
// aayegi hi nahi (Cloudflare ke peeche origin IP loopback hota hai), isliye
// ye exemption sirf local dev me safe hai.
// Opt-out: BOT_SHIELD_TRUST_LOOPBACK=false
const TRUST_LOOPBACK = (process.env.BOT_SHIELD_TRUST_LOOPBACK || 'true').toLowerCase() !== 'false';
// Electron/embedded-browser UA ko allow karna ho (preview deploy par Simple Browser) —
// BOT_SHIELD_TRUST_ELECTRON=true
const TRUST_ELECTRON = (process.env.BOT_SHIELD_TRUST_ELECTRON || 'false').toLowerCase() === 'true';

// ── Bot signatures ────────────────────────────────────────────────────────
const TOOL_USER_AGENTS: RegExp[] = [
  /curl/i, /wget/i, /python-requests/i, /python-urllib/i, /scrapy/i,
  /go-http-client/i, /okhttp/i, /java\/1\./i, /libwww-perl/i, /node-fetch/i,
  /axios\//i, /postmanruntime/i, /insomnia/i, /httpclient/i, /apache-httpclient/i,
  /php\/[0-9]/i, /ruby/i, /powershell/i, /httpie/i, /aiohttp/i
];

const HEADLESS_USER_AGENTS: RegExp[] = [
  /headlesschrome/i, /phantomjs/i, /puppeteer/i, /playwright/i, /selenium/i,
  /webdriver/i, /cypress/i, /slimerjs/i
];

// Electron = Chromium embedded app (VS Code Simple Browser, desktop wrappers).
// Ye "headless automation" nahi hai — inhe alag se treat karte hain.
const ELECTRON_USER_AGENTS: RegExp[] = [/electron\//i, /code\/[0-9]/i];

const CRAWLER_USER_AGENTS: RegExp[] = [
  /bot\b/i, /spider/i, /crawler/i, /slurp/i, /semrush/i, /ahrefs/i,
  /mj12/i, /dataprovider/i, /dotbot/i, /yandex/i, /baiduspider/i
];

// App ke andar khula hua link (WhatsApp/Telegram etc.) legit hai — inhe mat roko.
const TRUSTED_APP_USER_AGENTS = /whatsapp|telegram|instagram|facebook|linkedin|pinterest|gmail/i;

const SCANNER_PATHS: RegExp[] = [
  /^\/\.env/i, /^\/\.git/i, /^\/\.aws/i, /^\/\.ssh/i, /^\/\.npm/i,
  /^\/wp-admin/i, /^\/wp-login/i, /\/phpmyadmin/i, /\/xmlrpc\.php/i,
  /^\/vendor\/phpunit/i, /^\/actuator/i, /^\/solr/i, /^\/console/i,
  /^\/cgi-bin/i, /^\/server-status/i, /^\/config\.json/i, /^\/\.htaccess/i,
  /%00/i, /\.\./i
];

const ALLOWED_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']);

// ── State ─────────────────────────────────────────────────────────────────
const memoryEvents: SecurityEvent[] = [];
const blockedIps = new Set<string>();
// Auto-block: track suspicious hits per IP
const suspiciousCountByIp = new Map<string, number>();
const lastSuspiciousTimeByIp = new Map<string, number>();
const AUTO_BLOCK_SUSPICIOUS_THRESHOLD = 5; // same IP se 5 baar suspicious hone par auto-block
let eventCounter = 0;
let diskWriteCount = 0;
let diskBytes = 0;

function ensureLogDir(): boolean {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

function loadBlocklist(): void {
  try {
    if (!fs.existsSync(BLOCKLIST_FILE)) return;
    const raw = fs.readFileSync(BLOCKLIST_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach(ip => {
        if (typeof ip === 'string' && ip.trim()) blockedIps.add(ip.trim());
      });
    }
  } catch {
    // Corrupt file ho to ignore karo, app crash nahi hoga.
  }
}

function persistBlocklist(): void {
  if (!ensureLogDir()) return;
  try {
    fs.writeFileSync(BLOCKLIST_FILE, JSON.stringify([...blockedIps], null, 2));
  } catch {
    // Ignore write errors.
  }
}

function rotateDiskLogIfNeeded(): void {
  diskWriteCount += 1;
  if (diskWriteCount % 25 !== 0) return;
  try {
    if (!fs.existsSync(LOG_FILE)) return;
    const size = fs.statSync(LOG_FILE).size;
    if (size < MAX_DISK_BYTES) return;
    for (let index = MAX_DISK_FILES; index >= 1; index -= 1) {
      const source = index === 1 ? LOG_FILE : `${LOG_FILE}.${index - 1}`;
      const target = `${LOG_FILE}.${index}`;
      if (fs.existsSync(source)) {
        if (index === MAX_DISK_FILES) fs.unlinkSync(source);
        else fs.renameSync(source, target);
      }
    }
    diskBytes = 0;
  } catch {
    // Ignore rotation errors.
  }
}

function appendEventToDisk(event: SecurityEvent): void {
  if (event.verdict === 'ALLOWED') return; // Sirf suspicious/blocked disk par jate hain.
  if (!ensureLogDir()) return;
  rotateDiskLogIfNeeded();
  const line = `${JSON.stringify(event)}\n`;
  fs.appendFile(LOG_FILE, line, error => {
    if (error) console.error(`[BotShield] attack log write failed: ${error.message}`);
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────
function readHeader(req: Request, name: string): string {
  const value = req.headers[name];
  if (typeof value === 'string') return value;
  if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
  return '';
}

function normalizeIp(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return 'unknown';
  if (trimmed.startsWith('::ffff:')) return trimmed.slice(7);
  return trimmed;
}

/** Loopback (localhost / 127.x / ::1) request hai? */
export function isLoopbackIp(raw: string): boolean {
  const ip = normalizeIp(raw).toLowerCase();
  if (!ip || ip === 'unknown') return false;
  return ip === '::1' || ip === 'localhost' || ip.startsWith('127.');
}

/**
 * Client ka real IP — spoof-proof.
 *  - Cloudflare se aaya request: `cf-connecting-ip` CF ne verify kiya hota hai.
 *  - Bina Cloudflare ke: sirf socket address (X-Forwarded-For spoof nahi ho sakta).
 */
export function resolveClientIp(req: Request): string {
  const cfRay = readHeader(req, 'cf-ray');
  const cfIp = normalizeIp(readHeader(req, 'cf-connecting-ip'));
  if (cfRay && cfIp && cfIp !== 'unknown') return cfIp;
  return normalizeIp(req.socket.remoteAddress || readHeader(req, 'x-forwarded-for').split(',')[0] || '');
}

export function resolveClientNetwork(req: Request): ClientNetworkInfo {
  const cfRay = readHeader(req, 'cf-ray');
  const viaCloudflare = Boolean(cfRay);
  const country = viaCloudflare ? (readHeader(req, 'cf-ipcountry').trim().toUpperCase() || 'XX') : 'XX';
  return { ip: resolveClientIp(req), country, cfRay, viaCloudflare };
}

export interface BotScore {
  score: number;
  reasons: string[];
}

/**
 * 0 = bilkul normal browser request, 100 = definite bot/scanner.
 */
export function scoreRequest(req: Request, network: ClientNetworkInfo): BotScore {
  let score = 0;
  const reasons: string[] = [];

  const userAgent = readHeader(req, 'user-agent').trim();
  const localDev = TRUST_LOOPBACK && isLoopbackIp(network.ip);

  if (!userAgent) {
    score += 65;
    reasons.push('missing_user_agent');
  } else {
    if (TOOL_USER_AGENTS.some(pattern => pattern.test(userAgent))) {
      // Local dev me curl/postman jaise tools block karna developer ko hi pareshan karta hai.
      score += localDev ? 15 : 45;
      reasons.push('known_tool_user_agent');
    }
    if (HEADLESS_USER_AGENTS.some(pattern => pattern.test(userAgent))) {
      score += 70;
      reasons.push('headless_automation_user_agent');
    }
    if (ELECTRON_USER_AGENTS.some(pattern => pattern.test(userAgent))) {
      // VS Code Simple Browser / Electron jaisa embedded Chromium — dev me legit hai.
      if (localDev || TRUST_ELECTRON) {
        reasons.push('electron_embedded_browser_allowed');
      } else {
        score += 70;
        reasons.push('electron_user_agent');
      }
    }
    if (CRAWLER_USER_AGENTS.some(pattern => pattern.test(userAgent))) {
      score += 45;
      reasons.push('crawler_user_agent');
    }
    if (!/Mozilla/i.test(userAgent) && !TRUSTED_APP_USER_AGENTS.test(userAgent)) {
      score += 25;
      reasons.push('not_a_browser_user_agent');
    }
  }

  if (!readHeader(req, 'accept').trim()) {
    score += 25;
    reasons.push('missing_accept_header');
  }

  if (!readHeader(req, 'accept-language').trim()) {
    score += 8;
    reasons.push('missing_accept_language');
  }

  if (network.country && network.country !== 'XX' && !ALLOWED_COUNTRIES.includes(network.country)) {
    score += 35;
    reasons.push(`country_not_allowed:${network.country}`);
  }

  const requestPath = req.path || req.url || '';
  if (SCANNER_PATHS.some(pattern => pattern.test(requestPath))) {
    score += 75;
    reasons.push('scanner_path_probe');
  }

  if (!ALLOWED_METHODS.has(req.method)) {
    score += 15;
    reasons.push('unusual_http_method');
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

// ── Event logging ─────────────────────────────────────────────────────────
export function recordSecurityEvent(event: SecurityEvent): void {
  memoryEvents.push(event);
  if (memoryEvents.length > MAX_MEMORY_EVENTS) {
    memoryEvents.splice(0, memoryEvents.length - MAX_MEMORY_EVENTS);
  }
  appendEventToDisk(event);
}

export interface SecurityEventFilter {
  limit?: number;
  verdict?: SecurityVerdict | 'ALL';
  country?: string;
  ip?: string;
}

export function getSecurityEvents(filter: SecurityEventFilter = {}): SecurityEvent[] {
  const limit = Math.min(Math.max(Number(filter.limit) || 100, 1), 1000);
  let events = memoryEvents;
  if (filter.verdict && filter.verdict !== 'ALL') {
    events = events.filter(event => event.verdict === filter.verdict);
  }
  if (filter.country) {
    const country = filter.country.trim().toUpperCase();
    events = events.filter(event => event.country === country);
  }
  if (filter.ip) {
    const ip = filter.ip.trim();
    events = events.filter(event => event.ip === ip);
  }
  return events.slice(-limit).reverse();
}

export function getSecuritySummary() {
  const now = Date.now();
  const last24h = memoryEvents.filter(event => now - new Date(event.time).getTime() <= 24 * 60 * 60 * 1000);
  const last1h = memoryEvents.filter(event => now - new Date(event.time).getTime() <= 60 * 60 * 1000);

  const countBy = (events: SecurityEvent[], pick: (event: SecurityEvent) => string) => {
    const map = new Map<string, number>();
    events.forEach(event => {
      const key = pick(event) || 'unknown';
      map.set(key, (map.get(key) || 0) + 1);
    });
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => ({ key, count }));
  };

  return {
    totalRequests: memoryEvents.length,
    last24hRequests: last24h.length,
    last1hRequests: last1h.length,
    blocked: memoryEvents.filter(event => event.verdict === 'BLOCKED').length,
    suspicious: memoryEvents.filter(event => event.verdict === 'SUSPICIOUS').length,
    allowed: memoryEvents.filter(event => event.verdict === 'ALLOWED').length,
    blockedLast24h: last24h.filter(event => event.verdict === 'BLOCKED').length,
    topBlockedIps: countBy(last24h.filter(event => event.verdict === 'BLOCKED'), event => event.ip),
    topSuspiciousIps: countBy(last24h.filter(event => event.verdict === 'SUSPICIOUS'), event => event.ip),
    topPaths: countBy(last24h, event => event.path),
    byCountry: countBy(last24h, event => event.country),
    topUserAgents: countBy(last24h, event => event.userAgent),
    blockedIpList: [...blockedIps],
    thresholds: { blockScore: BLOCK_SCORE, suspiciousScore: SUSPICIOUS_SCORE, allowedCountries: ALLOWED_COUNTRIES },
    viaCloudflare: last24h.filter(event => event.viaCloudflare).length,
    directToOrigin: last24h.filter(event => !event.viaCloudflare).length
  };
}

export function blockIp(ip: string): boolean {
  const clean = normalizeIp(ip);
  if (!clean || clean === 'unknown') return false;
  blockedIps.add(clean);
  persistBlocklist();
  return true;
}

export function unblockIp(ip: string): boolean {
  const clean = normalizeIp(ip);
  const removed = blockedIps.delete(clean);
  if (removed) persistBlocklist();
  return removed;
}

export function getBlockedIps(): string[] {
  return [...blockedIps];
}

export function isIpBlocked(ip: string): boolean {
  return blockedIps.has(normalizeIp(ip));
}

// ── Middleware ────────────────────────────────────────────────────────────
export function botShieldMiddleware(req: Request, res: Response, next: NextFunction) {
  // Allow all in development for testing
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }
  const startedAt = process.hrtime.bigint();
  const network = resolveClientNetwork(req);
  const { score, reasons } = scoreRequest(req, network);

  let verdict: SecurityVerdict = 'ALLOWED';
  if (isIpBlocked(network.ip)) {
    verdict = 'BLOCKED';
    reasons.unshift('ip_blocklisted_by_admin');
  } else if (score >= BLOCK_SCORE) {
    verdict = 'BLOCKED';
  } else if (score >= SUSPICIOUS_SCORE) {
    verdict = 'SUSPICIOUS';
  }

  res.setHeader('X-Bot-Protection', verdict.toLowerCase());
  res.setHeader('X-Bot-Score', String(score));

  if (verdict === 'BLOCKED') {
    const event: SecurityEvent = {
      id: ++eventCounter,
      time: new Date().toISOString(),
      ip: network.ip,
      country: network.country,
      cfRay: network.cfRay,
      viaCloudflare: network.viaCloudflare,
      method: req.method,
      path: req.path || req.url,
      status: 403,
      score,
      verdict,
      reasons,
      userAgent: readHeader(req, 'user-agent').slice(0, 220),
      referer: readHeader(req, 'referer').slice(0, 220)
    };
    recordSecurityEvent(event);
    console.warn(`[BotShield] BLOCKED ${network.ip} (${network.country}) score=${score} ${event.method} ${event.path} :: ${reasons.join(', ')}`);
    return res.status(403).json({
      success: false,
      error: 'Request blocked by bot protection. Please try again from a normal browser.'
    });
  }

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const eventReasons = [...reasons];
    // Auto-block: suspicious hit repeated many times from same IP (possible brute/hack attempt)
    if (verdict === 'SUSPICIOUS' && !isIpBlocked(network.ip)) {
      const now = Date.now();
      const last = lastSuspiciousTimeByIp.get(network.ip) || 0;
      if (now - last > 10 * 60 * 1000) {
        suspiciousCountByIp.set(network.ip, 1);
      } else {
        const cnt = (suspiciousCountByIp.get(network.ip) || 0) + 1;
        suspiciousCountByIp.set(network.ip, cnt);
        if (cnt >= AUTO_BLOCK_SUSPICIOUS_THRESHOLD) {
          blockIp(network.ip);
          eventReasons.push('auto_blocked_due_to_repeated_suspicious_hits');
          console.warn(`[BotShield] AUTO-BLOCKED ${network.ip} (${network.country}) after ${cnt} suspicious hits (possible hack/brute attempt)`);
        }
      }
      lastSuspiciousTimeByIp.set(network.ip, now);
    }

    const event: SecurityEvent = {
      id: ++eventCounter,
      time: new Date().toISOString(),
      ip: network.ip,
      country: network.country,
      cfRay: network.cfRay,
      viaCloudflare: network.viaCloudflare,
      method: req.method,
      path: req.path || req.url,
      status: res.statusCode,
      score,
      verdict,
      reasons: eventReasons,
      userAgent: readHeader(req, 'user-agent').slice(0, 220),
      referer: readHeader(req, 'referer').slice(0, 220)
    };
    recordSecurityEvent(event);
    if (verdict === 'SUSPICIOUS') {
      console.warn(`[BotShield] SUSPICIOUS ${network.ip} (${network.country}) score=${score} ${event.method} ${event.path} :: ${eventReasons.join(', ')}`);
    } else if (process.env.BOT_SHIELD_DEBUG === 'true') {
      console.log(`[BotShield] ${network.ip} (${network.country}) score=${score} ${event.method} ${event.path} ${durationMs.toFixed(2)}ms`);
    }
  });

  next();
}

loadBlocklist();
