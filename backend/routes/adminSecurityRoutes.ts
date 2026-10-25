import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { getAdminToken } from '../env.ts';
import { clearAdminUpi, clearGovtUpi, getAdminUpi, getAdminUpiSource, getGovtUpi, getGovtUpiSource, setAdminUpi, setGovtUpi } from '../services/pricingService.ts';
import {
  blockIp,
  getBlockedIps,
  getSecurityEvents,
  getSecuritySummary,
  unblockIp
} from '../middleware/botShieldMiddleware.ts';
import { getAdminPaymentLedger, updateAdminPaymentLedgerStatus } from '../services/storeService.ts';

export const adminSecurityRouter = Router();

// ========================================================
// 🛡️ ADMIN SECURITY CONSOLE (attack log + IP blocklist)
// ========================================================
// Ye routes ADMIN_TOKEN se protected hain (x-admin-token header ya adminToken body).
// Yahan se pata chalega ki bot kahan se aa rahe hain: IP, country, Cloudflare ray,
// user-agent, kaunsa path target ho raha hai, aur kitne requests aaye.

function tokenMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function readProvidedToken(headerValue: unknown, bodyValue: unknown): string {
  const header = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof header === 'string' && header.trim()) return header.trim();
  if (typeof bodyValue === 'string' && bodyValue.trim()) return bodyValue.trim();
  return '';
}

function requireAdminToken(req: import('express').Request, res: import('express').Response): boolean {
  const expected = getAdminToken();
  if (!expected) {
    res.status(503).json({
      success: false,
      error: 'Admin security console is not configured. Set ADMIN_TOKEN on the server.'
    });
    return false;
  }
  const provided = readProvidedToken(req.headers['x-admin-token'], req.body?.adminToken);
  if (!provided || !tokenMatches(provided, expected)) {
    res.status(401).json({ success: false, error: 'Invalid admin token.' });
    return false;
  }
  return true;
}

adminSecurityRouter.get('/admin/security/summary', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json({ success: true, summary: getSecuritySummary() });
});

adminSecurityRouter.get('/admin/security/log', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const verdictParam = String(req.query.verdict || 'ALL').toUpperCase();
  const verdict = (['ALLOWED', 'SUSPICIOUS', 'BLOCKED', 'ALL'] as const).includes(verdictParam as 'ALL')
    ? (verdictParam as 'ALLOWED' | 'SUSPICIOUS' | 'BLOCKED' | 'ALL')
    : 'ALL';
  const events = getSecurityEvents({
    limit: Number(req.query.limit) || 150,
    verdict,
    country: typeof req.query.country === 'string' ? req.query.country : undefined,
    ip: typeof req.query.ip === 'string' ? req.query.ip : undefined
  });
  res.json({ success: true, count: events.length, events });
});

adminSecurityRouter.get('/admin/security/blocked-ips', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  res.json({ success: true, blockedIps: getBlockedIps() });
});

adminSecurityRouter.post('/admin/security/block-ip', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const ip = String(req.body?.ip || '').trim();
  if (!ip) {
    return res.status(400).json({ success: false, error: 'IP address is required.' });
  }
  const blocked = blockIp(ip);
  res.json({ success: true, blocked, ip, blockedIps: getBlockedIps() });
});

adminSecurityRouter.post('/admin/security/unblock-ip', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const ip = String(req.body?.ip || '').trim();
  if (!ip) {
    return res.status(400).json({ success: false, error: 'IP address is required.' });
  }
  const removed = unblockIp(ip);
  res.json({ success: true, removed, ip, blockedIps: getBlockedIps() });
});

// ========================================================
// 💳 ADMIN PAYMENT LEDGER (auto-verified commissions)
// ========================================================
adminSecurityRouter.get('/admin/payments/ledger', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const ledger = getAdminPaymentLedger();
  res.json({
    success: true,
    count: ledger.length,
    total: ledger.filter(item => item.status !== 'Reversed').reduce((sum, item) => sum + item.amount, 0),
    ledger
  });
});

adminSecurityRouter.post('/admin/payments/ledger/:id/status', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const status = String(req.body?.status || '').trim();
  if (status !== 'Reconciled' && status !== 'Reversed') {
    return res.status(400).json({ success: false, error: 'Status must be Reconciled or Reversed.' });
  }
  const updated = updateAdminPaymentLedgerStatus(req.params.id, status, typeof req.body?.note === 'string' ? req.body.note.trim() : undefined);
  if (!updated) return res.status(404).json({ success: false, error: 'Ledger entry not found.' });
  res.json({ success: true, message: `Admin payment marked ${status}.`, entry: updated });
});

// ========================================================
// 💳 ADMIN PAYMENT SETTINGS (Admin UPI ID)
// ========================================================
// Admin fee ka QR citizen ko dikhna ho to ADMIN_UPI_ID set hona chahiye.
// Ye endpoints server restart ke bina UPI ID set/clear karne dete hain.
adminSecurityRouter.get('/admin/settings/upi', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const admin = getAdminUpi();
  res.json({
    success: true,
    settings: {
      upiId: admin.upiId,
      payeeName: admin.payeeName,
      source: getAdminUpiSource()
    }
  });
});

adminSecurityRouter.post('/admin/settings/upi', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const upiId = String(req.body?.upiId || '').trim().toLowerCase();
  const payeeName = String(req.body?.payeeName || '').trim();

  if (!upiId) {
    clearAdminUpi();
    const admin = getAdminUpi();
    return res.json({
      success: true,
      message: 'Admin UPI cleared. The server .env.local value (if any) will be used instead.',
      settings: { upiId: admin.upiId, payeeName: admin.payeeName, source: getAdminUpiSource() }
    });
  }
  if (!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(upiId)) {
    return res.status(400).json({ success: false, error: 'Enter a valid UPI ID, such as name@bank.' });
  }

  setAdminUpi(upiId, payeeName);
  const admin = getAdminUpi();
  return res.json({
    success: true,
    message: '✅ Admin UPI saved. The Admin Fee QR will now show this UPI ID to citizens.',
    settings: { upiId: admin.upiId, payeeName: admin.payeeName, source: getAdminUpiSource() }
  });
});

// ========================================================
// 🏛️ GOVERNMENT FEE UPI (global fallback)
// ========================================================
// Operator ne per-order govt UPI/QR set na kiya ho to ye global UPI use hoti hai.
// Server restart ke bina set/clear kar sakte hain — bilkul Admin Fee UPI ki tarah.
adminSecurityRouter.get('/admin/settings/govt-upi', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const govt = getGovtUpi();
  res.json({
    success: true,
    settings: {
      upiId: govt.upiId,
      payeeName: govt.payeeName,
      source: getGovtUpiSource()
    }
  });
});

adminSecurityRouter.post('/admin/settings/govt-upi', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const upiId = String(req.body?.upiId || '').trim().toLowerCase();
  const payeeName = String(req.body?.payeeName || '').trim();

  if (!upiId) {
    clearGovtUpi();
    const govt = getGovtUpi();
    return res.json({
      success: true,
      message: 'Government UPI cleared. The server .env.local value (if any) will be used instead.',
      settings: { upiId: govt.upiId, payeeName: govt.payeeName, source: getGovtUpiSource() }
    });
  }
  if (!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(upiId)) {
    return res.status(400).json({ success: false, error: 'Enter a valid UPI ID, such as name@bank.' });
  }

  setGovtUpi(upiId, payeeName);
  const govt = getGovtUpi();
  return res.json({
    success: true,
    message: '✅ Government UPI saved. The Government Fee QR will now show this UPI ID to citizens.',
    settings: { upiId: govt.upiId, payeeName: govt.payeeName, source: getGovtUpiSource() }
  });
});
