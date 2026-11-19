import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { getAdminToken } from '../env.ts';
import { clearAdminUpi, getAdminUpi, getAdminUpiSource, setAdminUpi } from '../services/pricingService.ts';
import {
  blockIp,
  getBlockedIps,
  getSecurityEvents,
  getSecuritySummary,
  resolveClientIp,
  unblockIp
} from '../middleware/botShieldMiddleware.ts';
import {
  getAdminPaymentLedger,
  updateAdminPaymentLedgerStatus,
  listOperatorsForAdmin,
  listLocalOperatorUnavailableRequests,
  resolveLocalOperatorUnavailableRequest,
  suspendOperatorByIdentifier,
  unsuspendOperatorByIdentifier,
  userAccountsStore,
  vleOrdersStore,
  fillerOrdersStore
} from '../services/storeService.ts';
import {
  blockAccount,
  findAccountById,
  findAccountsForOrder,
  isAccountBlocked,
  operatorMetaForOrder,
  unblockAccount
} from '../services/accountBlockService.ts';

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
// 🚫 BLOCKED / FLAGGED USERS + ALL ORDERS (admin tracking)
// ========================================================
function adminUserView(account: any) {
  const relatedOrders = [...vleOrdersStore, ...fillerOrdersStore].filter(order => {
    const citizenMatch =
      String(order.clientEmail || '').toLowerCase() === String(account.email || '').toLowerCase() ||
      String(order.clientPhone || '').replace(/\D/g, '').slice(-10) === String(account.phone || '').replace(/\D/g, '').slice(-10);
    const operatorIds = [order.acceptedByVleId, order.acceptedByFillerId, order.acceptedById]
      .filter(Boolean)
      .map(value => String(value));
    const operatorMatch = Boolean(account.id && operatorIds.includes(String(account.id))) ||
      Boolean(account.cscId && operatorIds.includes(String(account.cscId)));
    return citizenMatch || operatorMatch;
  });
  return {
    id: account.id,
    cscId: account.cscId || '',
    name: account.name || '',
    phone: account.phone || '',
    email: account.email || '',
    role: account.role,
    roleLabel: account.role === 'client' ? 'Citizen' : account.role === 'vle' ? 'Jan Seva Kendra' : 'Student/Form Expert',
    accountStatus: account.accountStatus || 'active',
    blocked: isAccountBlocked(account),
    blockedAt: account.blockedAt,
    blockReason: account.blockReason || (account.autoBlockReason ? String(account.autoBlockReason) : ''),
    blockedOrderId: account.blockedOrderId || '',
    blockedOperatorId: account.blockedOperatorId || '',
    blockedOperatorName: account.blockedOperatorName || '',
    lastBlockedIp: account.lastBlockedIp || '',
    blockHistory: Array.isArray(account.blockHistory) ? account.blockHistory.slice(-10) : [],
    orderIds: relatedOrders.map(order => String(order.id)).slice(0, 20)
  };
}

adminSecurityRouter.get('/admin/users/blocked', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const users = userAccountsStore
    .filter(account => isAccountBlocked(account) || Boolean(account.blockHistory?.length) || Boolean((account as any).autoBlockReason))
    .map(adminUserView)
    .sort((a, b) => String(b.blockedAt || '').localeCompare(String(a.blockedAt || '')));
  res.json({ success: true, count: users.length, users });
});

adminSecurityRouter.get('/admin/orders', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const orders = [...vleOrdersStore, ...fillerOrdersStore]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map(order => {
      const { client, operator } = findAccountsForOrder(order);
      const op = operatorMetaForOrder(order);
      const reason = order.cancellationReason
        ? `Cancelled: ${order.cancellationReason}`
        : order.autoBlockReason || '';
      return {
        id: order.id,
        status: order.status,
        createdAt: order.createdAt,
        serviceName: order.serviceName || order.formTitle || 'Digital Service',
        citizen: {
          name: order.clientName || '',
          phone: order.clientPhone || '',
          email: order.clientEmail || '',
          accountId: client?.id || '',
          blocked: isAccountBlocked(client),
          blockReason: client?.blockReason || ''
        },
        operator: {
          id: op.id || '',
          accountId: operator?.id || '',
          name: op.name || '',
          roleLabel: op.roleLabel || '',
          blocked: isAccountBlocked(operator),
          blockReason: operator?.blockReason || ''
        },
        reason,
        isPaymentDoneInApp: Boolean(order.isPaymentDoneInApp),
        paymentVerificationStatus: order.paymentVerificationStatus || '',
        autoBlockedAt: order.autoBlockedAt || ''
      };
    });
  res.json({ success: true, count: orders.length, orders });
});

adminSecurityRouter.post('/admin/users/:id/block', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const account = findAccountById(req.params.id);
  if (!account) return res.status(404).json({ success: false, error: 'Account not found.' });
  const reason = String(req.body?.reason || '').trim().slice(0, 200);
  if (reason.length < 3) {
    return res.status(400).json({ success: false, error: 'Block reason is mandatory (at least 3 characters).' });
  }
  blockAccount(account, {
    reason,
    orderId: typeof req.body?.orderId === 'string' ? req.body.orderId : undefined,
    ip: resolveClientIp(req),
    actor: 'admin'
  });
  res.json({ success: true, message: `✅ Account blocked. Reason: ${reason}`, user: adminUserView(account) });
});

adminSecurityRouter.post('/admin/users/:id/unblock', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const account = findAccountById(req.params.id);
  if (!account) return res.status(404).json({ success: false, error: 'Account not found.' });
  const reason = String(req.body?.reason || '').trim().slice(0, 200);
  unblockAccount(account, { reason: reason || undefined, actor: 'admin' });
  res.json({ success: true, message: '✅ Account unblocked. User can log in again.', user: adminUserView(account) });
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
// 🚫 OPERATOR MANAGEMENT (suspend / unsuspend + audit trail)
// ========================================================
// Suspension proof-based hai: admin reason deta hai (optional days). Temporary
// suspension khud expire ho jaati hai, permanent sirf admin unsuspend kar sakta hai.
adminSecurityRouter.get('/admin/operators', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const search = typeof req.query.search === 'string' ? req.query.search : '';
  const operators = listOperatorsForAdmin(search);
  res.json({
    success: true,
    count: operators.length,
    suspendedCount: operators.filter(item => item.bidsSuspended).length,
    operators
  });
});

adminSecurityRouter.get('/admin/local-operator-requests', (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const requests = listLocalOperatorUnavailableRequests();
  res.json({ success: true, count: requests.length, requests });
});

adminSecurityRouter.post('/admin/local-operator-requests/:id/resolve', async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  try {
    const resolved = await resolveLocalOperatorUnavailableRequest(req.params.id);
    if (!resolved) {
      return res.status(404).json({ success: false, error: 'Local operator request not found or already resolved.' });
    }
    return res.json({ success: true, message: 'Local operator request marked as handled.' });
  } catch (error) {
    console.error('[Admin] Could not resolve local operator request:', error);
    return res.status(500).json({ success: false, error: 'Could not update the local operator request.' });
  }
});

adminSecurityRouter.post('/admin/operators/:id/suspend', async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const reason = String(req.body?.reason || '').trim();
  if (!reason) {
    return res.status(400).json({ success: false, error: 'A suspension reason is required (proof-based action).' });
  }
  const days = Number(req.body?.days) || 0;
  if (!Number.isFinite(days) || days < 0 || days > 3650) {
    return res.status(400).json({ success: false, error: 'Suspension days must be between 0 (permanent) and 3650.' });
  }
  const updated = await suspendOperatorByIdentifier(req.params.id, {
    reason,
    days,
    note: typeof req.body?.note === 'string' ? req.body.note : undefined,
    by: typeof req.body?.adminName === 'string' ? req.body.adminName : 'Admin'
  });
  if (!updated) return res.status(404).json({ success: false, error: 'Operator not found.' });
  res.json({
    success: true,
    message: days > 0
      ? `⏸️ Operator suspended for ${days} day(s). Bids will resume automatically after the period.`
      : '⛔ Operator suspended permanently. Only an admin can unsuspend.',
    operator: updated
  });
});

adminSecurityRouter.post('/admin/operators/:id/unsuspend', async (req, res) => {
  if (!requireAdminToken(req, res)) return;
  const updated = await unsuspendOperatorByIdentifier(req.params.id, {
    reason: typeof req.body?.reason === 'string' ? req.body.reason : undefined,
    by: typeof req.body?.adminName === 'string' ? req.body.adminName : 'Admin'
  });
  if (!updated) return res.status(404).json({ success: false, error: 'Operator not found.' });
  res.json({ success: true, message: '✅ Operator unsuspended. They can accept bids again.', operator: updated });
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
      message: 'Admin UPI cleared from the database. The server .env value (if any) will be used instead.',
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
    message: '✅ Admin UPI saved permanently in the database. It survives server restarts and redeploys.',
    settings: { upiId: admin.upiId, payeeName: admin.payeeName, source: getAdminUpiSource() }
  });
});

// 🏛️ Government UPI is intentionally NOT configurable globally anymore.
// The assigned operator sets it per order (order.govtUpiId / order.govtQrImage)
// and it is deleted automatically when the order completes.
