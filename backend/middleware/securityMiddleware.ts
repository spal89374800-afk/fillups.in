import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { UserAccount, getAccountByToken } from '../services/storeService.ts';
import { resolveClientIp } from './botShieldMiddleware.ts';

export function getRequestAccount(req: Request): UserAccount | undefined {
  const header = req.headers['authorization'];
  const headerValue = Array.isArray(header) ? header[0] : header;
  const bodyToken = req.body && typeof req.body === 'object'
    ? (req.body.authToken || req.body.token)
    : undefined;
  const queryToken = typeof req.query?.authToken === 'string' ? req.query.authToken : undefined;
  return getAccountByToken(headerValue) || getAccountByToken(bodyToken) || getAccountByToken(queryToken);
}

export function resolveAccount(req: Request, _res: Response, next: NextFunction) {
  const account = getRequestAccount(req);
  if (account) {
    (req as Request & { account?: UserAccount }).account = account;
  }
  next();
}

export function requireAccount(role?: UserAccount['role']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const account = getRequestAccount(req);
    if (!account) {
      return res.status(401).json({ success: false, error: 'Login required. Please sign in again.' });
    }
    if (role && account.role !== role) {
      return res.status(403).json({ success: false, error: 'This action is not allowed for your account type.' });
    }
    (req as Request & { account?: UserAccount }).account = account;
    next();
  };
}

// 1. Strict Rate Limiter to prevent DDoS and Brute Force
// keyGenerator apna client IP use karta hai (spoof-proof):
// Cloudflare ke peeche `cf-connecting-ip`, warna direct socket address.
// X-Forwarded-For spoof karke limit bypass nahi ho sakta.
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  keyGenerator: (req: Request) => ipKeyGenerator(resolveClientIp(req)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

export const authAndSubmitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 100,
  keyGenerator: (req: Request) => ipKeyGenerator(resolveClientIp(req)),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Rate limit exceeded for submissions. Please wait before retrying.' }
});

// 2. Enterprise Security Headers Middleware
export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'");
  next();
}

// 3. Input Sanitization & Anti-Injection Middleware
// Pehle sirf top-level string fields sanitize hote the — nested objects me
// script inject ho sakta tha. Ab recursive sanitize hota hai (depth 5 tak).

// Data URLs (base64 image payloads) me markup nahi hota, lekin unke andar ka
// base64 text "on...=" jaisa pattern contain kar sakta hai — sanitize karne se
// QR image ka base64 corrupt ho jaata hai aur image render hi nahi hoti.
// Isliye data: URLs ko as-is chhodte hain (mime validation alag se hoti hai).
function isDataUrl(value: string): boolean {
  return /^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,/i.test(value);
}

function stripDangerousMarkup(value: string): string {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

function sanitizeValue(value: unknown, depth: number): unknown {
  if (depth > 5) return value;
  if (typeof value === 'string') return isDataUrl(value) ? value : stripDangerousMarkup(value);
  if (Array.isArray(value)) return value.map(item => sanitizeValue(item, depth + 1));
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>)) {
      output[key] = sanitizeValue((value as Record<string, unknown>)[key], depth + 1);
    }
    return output;
  }
  return value;
}

export function sanitizeInputs(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body, 0) as Request['body'];
  }

  next();
}

// 4. API Key / Webhook Security Validator for 3rd Party Integrations
export function verifyThirdPartyApiKey(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const webhookSignature = req.headers['x-digiseva-signature'];

  if (req.path.includes('/webhook') || req.path.includes('/secure-partner')) {
    // Live deploy pe default secret use karna vulnerability hai — isliye
    // PARTNER_API_KEY set na ho to request reject hogi (fail closed).
    const expectedKey = process.env.PARTNER_API_KEY?.trim();
    if (!expectedKey) {
      return res.status(503).json({
        success: false,
        error: 'Partner API key is not configured on the server. Set PARTNER_API_KEY before enabling partner endpoints.'
      });
    }
    const authToken = typeof authHeader === 'string' ? authHeader.replace(/^Bearer\s+/i, '') : '';
    const isValidAuth = authToken === expectedKey;
    const isValidSignature = webhookSignature === process.env.PARTNER_WEBHOOK_SIGNATURE?.trim();

    if (!isValidAuth && !isValidSignature) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid 3rd Party API Key or Webhook Signature' });
    }
  }

  next();
}
