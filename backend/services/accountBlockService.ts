import { readEnvValue } from '../env.ts';
import {
  normalizeEmail,
  persistToMongo,
  userAccountsStore,
  type UserAccount
} from './storeService.ts';
import type { AccountBlockEntry } from '../types/index.ts';

// ⚙️ Dono time server env se badle ja sakte hain (Render dashboard), code edit ki zarurat nahi.
// Grace: tab band hone ke baad kitna wait. Inactivity: proof ke baad kitni der tak koi signal na aaye to block.
function envMinutes(name: string, fallback: number): number {
  const value = Number(readEnvValue(name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const ABANDON_GRACE_MINUTES = envMinutes('ABANDON_GRACE_MINUTES', 30);
export const NON_PAYMENT_BLOCK_MINUTES = envMinutes('NON_PAYMENT_BLOCK_MINUTES', 120);
export const ABANDON_GRACE_MS = ABANDON_GRACE_MINUTES * 60_000;
export const NON_PAYMENT_BLOCK_MS = NON_PAYMENT_BLOCK_MINUTES * 60_000;
export const AUTO_BLOCK_REASON = 'Auto-Blocked for Non-Payment';

export interface BlockInput {
  reason: string;
  orderId?: string;
  operatorId?: string;
  operatorName?: string;
  ip?: string;
  actor?: string;
}

export function isAccountBlocked(account?: UserAccount | null): boolean {
  return Boolean(account && (account.accountStatus === 'blocked' || (account as UserAccount & { isBlocked?: boolean }).isBlocked === true));
}

export function accountBlockedPayload(account?: UserAccount | null) {
  return {
    success: false,
    code: 'ACCOUNT_BLOCKED',
    error: `🚫 Account blocked: ${account?.blockReason || AUTO_BLOCK_REASON}. Admin se contact karein.`,
    reason: account?.blockReason || AUTO_BLOCK_REASON,
    blockedAt: account?.blockedAt,
    blockedOrderId: account?.blockedOrderId
  };
}

/**
 * Login / OTP / registration se pehle identity match karke block check karna.
 * Gmail + phone PRIMARY identity hain — role se filter nahi karte, warna blocked
 * user doosre role (citizen ↔ operator) se naya account bana ke aa jayega.
 */
export function findBlockedAccountByIdentity(input: {
  email?: unknown;
  phone?: unknown;
  role?: UserAccount['role'];
}): UserAccount | undefined {
  const email = normalizeEmail(typeof input.email === 'string' ? input.email : '');
  const phone = String(input.phone || '').replace(/\D/g, '').slice(-10);
  if (!email && !phone) return undefined;
  return userAccountsStore.find(account => {
    if (!isAccountBlocked(account)) return false;
    const accountEmail = normalizeEmail(account.email || '');
    const accountPhone = String(account.phone || '').replace(/\D/g, '').slice(-10);
    return Boolean((email && accountEmail === email) || (phone && accountPhone === phone));
  });
}

export function blockAccount(account: UserAccount, input: BlockInput): UserAccount {
  const now = new Date().toISOString();
  account.accountStatus = 'blocked';
  account.blockedAt = now;
  account.blockReason = input.reason || AUTO_BLOCK_REASON;
  if (input.orderId) account.blockedOrderId = input.orderId;
  if (input.operatorId) account.blockedOperatorId = input.operatorId;
  if (input.operatorName) account.blockedOperatorName = input.operatorName;
  if (input.ip) account.lastBlockedIp = input.ip;
  const entry: AccountBlockEntry = {
    action: 'block',
    reason: account.blockReason,
    at: now,
    by: input.actor || 'system',
    orderId: input.orderId,
    operatorId: input.operatorId,
    ip: input.ip
  };
  account.blockHistory = [...(account.blockHistory || []), entry].slice(-30);
  void persistToMongo('userAccount', account).catch(() => {});
  return account;
}

export function unblockAccount(account: UserAccount, input: { reason?: string; actor?: string } = {}): UserAccount {
  const now = new Date().toISOString();
  account.accountStatus = 'active';
  const previousReason = account.blockReason || AUTO_BLOCK_REASON;
  delete account.blockedAt;
  delete account.blockReason;
  delete account.blockedOrderId;
  delete account.blockedOperatorId;
  delete account.blockedOperatorName;
  const entry: AccountBlockEntry = {
    action: 'unblock',
    reason: input.reason || `Admin review ke baad block hataaya gaya. Purana reason: ${previousReason}`,
    at: now,
    by: input.actor || 'admin'
  };
  account.blockHistory = [...(account.blockHistory || []), entry].slice(-30);
  void persistToMongo('userAccount', account).catch(() => {});
  return account;
}

export function findAccountById(idOrCscId: string): UserAccount | undefined {
  const key = String(idOrCscId || '').trim();
  if (!key) return undefined;
  return userAccountsStore.find(account => account.id === key || account.cscId === key);
}

export function operatorMetaForOrder(order: any): { id?: string; name?: string; roleLabel?: string } {
  const id = order.acceptedByVleId || order.acceptedByFillerId || order.acceptedById;
  const name = order.acceptedByVleName || order.acceptedByFillerName || order.acceptedByName;
  const roleLabel = order.acceptedByRoleLabel ||
    (order.acceptedByFillerId || order.acceptedByFillerName ? 'Student/Form Expert' : 'Jan Seva Kendra');
  return { id: id ? String(id) : undefined, name: name ? String(name) : undefined, roleLabel };
}

export function findAccountsForOrder(order: any): { client?: UserAccount; operator?: UserAccount } {
  const orderPhone = String(order.clientPhone || '').replace(/\D/g, '').slice(-10);
  const orderEmail = normalizeEmail(order.clientEmail || '');
  const client = userAccountsStore.find(account =>
    account.role === 'client' && (
      (orderEmail && normalizeEmail(account.email || '') === orderEmail) ||
      (orderPhone && String(account.phone || '').replace(/\D/g, '').slice(-10) === orderPhone)
    )
  );

  const meta = operatorMetaForOrder(order);
  const operator = meta.id
    ? userAccountsStore.find(account => account.role !== 'client' && (account.id === meta.id || account.cscId === meta.id))
    : undefined;
  return { client, operator };
}

/** Work complete ka signal — sirf proof/pdf ya proof_submitted status. */
export function isWorkProofReady(order: any): boolean {
  return Boolean(
    order?.previewPhotoProof ||
    order?.completedFormUploadedAt ||
    order?.status === 'proof_submitted' ||
    order?.status === 'paid' ||
    order?.status === 'completed'
  );
}

/** Citizen ne payment claim to kiya hai (UTR) — tab block hold, confirm operator karega. */
export function hasPaymentClaim(order: any): boolean {
  return order?.paymentVerificationStatus === 'reported' || Boolean(order?.paymentReportedAt);
}

function latestSignalMillis(order: any): number | null {
  const stamps = [order?.lastPresenceAt, order?.lastActivityAt, order?.proofSubmittedAt, order?.createdAt]
    .map(value => {
      const time = Date.parse(String(value || ''));
      return Number.isFinite(time) ? time : null;
    })
    .filter((value): value is number => value !== null);
  return stamps.length ? Math.max(...stamps) : null;
}

/**
 * Auto-block sirf tab jab:
 *   proof aa gaya + in-app payment nahi + UTR claim nahi + page/presence 2 ghante se purana.
 * Page khula hai to heartbeat lastPresenceAt ko fresh rakhta hai → yahin se galat block bachta hai.
 */
export function shouldAutoBlockOrder(order: any, now = Date.now()): boolean {
  if (!order || order.status === 'cancelled' || order.status === 'completed') return false;
  if (order.isPaymentDoneInApp) return false;
  if (!isWorkProofReady(order)) return false;
  if (hasPaymentClaim(order)) return false;
  if (order.autoBlockedAt || order.autoBlockReason) return false;
  const lastSignal = latestSignalMillis(order);
  if (lastSignal === null) return false;
  const idleMs = now - lastSignal;
  // 2 ghante ki inactivity zaroori hai. Tab band hone ka 30-min grace tab bhi
  // enforce karo jab beacon (pagehide) actually aaya ho — beacon na aaye to
  // 2 ghante ki idle window khud hi grace ka kaam karti hai.
  if (idleMs < NON_PAYMENT_BLOCK_MS) return false;
  const presenceEnded = Date.parse(String(order?.presenceEndedAt || ''));
  if (Number.isFinite(presenceEnded) && now - presenceEnded < ABANDON_GRACE_MS) return false;
  return idleMs >= ABANDON_GRACE_MS;
}

export async function applyAutoBlockToOrder(order: any, now = Date.now()): Promise<boolean> {
  if (!shouldAutoBlockOrder(order, now)) return false;
  const { client } = findAccountsForOrder(order);
  const operator = operatorMetaForOrder(order);
  const at = new Date(now).toISOString();
  if (client && !isAccountBlocked(client)) {
    blockAccount(client, {
      reason: AUTO_BLOCK_REASON,
      orderId: String(order.id || ''),
      operatorId: operator.id,
      operatorName: operator.name,
      actor: 'system-inactivity-sweep'
    });
  }
  order.autoBlockedAt = at;
  order.autoBlockReason = AUTO_BLOCK_REASON;
  order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
  order.chatMessages.push({
    id: 'm-autoblock-' + now,
    sender: 'operator',
    senderName: 'System',
    text: `🚫 ${AUTO_BLOCK_REASON}: proof submit hone ke baad 2 ghante tak payment ya activity nahi mili. Admin review tak account restricted hai.`,
    time: new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  return true;
}
