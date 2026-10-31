import type { FillerOrder, VleOperator, VleOrder } from '../types/index.ts';
import {
  canSendOfflineEmail,
  findAccountForOperator,
  normalizeLocation,
  persistAccount,
  persistOrder,
  recordOfflineEmail,
  userAccountsStore,
  type UserAccount
} from './storeService.ts';
import { emitDispatchEvent, emitOrderUpdate, isAccountOnline } from './realtimeService.ts';
import { isEmailConfigured, sendTransactionalEmail } from './emailService.ts';
import { readEnvValue } from '../env.ts';

export interface DispatchResult {
  inApp: number;
  emails: number;
  onlineIds: string[];
  offlineIds: string[];
  routing: 'city' | 'district' | 'target' | 'national' | 'offline_fallback';
  emailErrors: string[];
}

function roomId(value: unknown): string {
  return normalizeLocation(value);
}

function appLink(): string {
  return readEnvValue('APP_URL') || 'https://fillups.in';
}

function operatorEmailTargets(operator: VleOperator): { account?: UserAccount; email: string; name: string } {
  const account = findAccountForOperator(operator);
  return {
    account,
    email: String(account?.email || operator.email || '').trim(),
    name: String(account?.name || operator.name || 'Operator').trim()
  };
}

export function buildOrderEmail(order: VleOrder | FillerOrder, title: string): { subject: string; text: string } {
  const service = (order as any).formTitle || order.serviceName || 'Digital Service';
  const location = [order.city, order.district].filter(Boolean).join(', ') || 'India';
  const amount = Number(order.amountPaid || 0);
  const subject = `🆕 New citizen request: ${service}${location ? ` (${location})` : ''}`;
  const text = [
    `${title},`,
    '',
    'Aapke area me ek naya citizen request aaya hai. Pehle accept karne wale operator ko order milega.',
    '',
    `Request ID : ${order.id}`,
    `Service    : ${service}`,
    `Citizen    : ${order.clientName || 'Citizen'}`,
    `Location   : ${location}`,
    `Amount     : ₹${amount.toFixed(2)}`,
    `Details    : ${(order as any).formDetails || 'Please open the dashboard for full details.'}`,
    '',
    `Dashboard  : ${appLink()}`,
    '',
    'Note: Aap offline the isliye email bheji gayi hai. Online aate hi email band ho jaayegi aur',
    'aapko in-app notification milengi. Ek time par sirf ek active order le sakte hain.',
    '',
    '— DigiSeva Pro'
  ].join('\n');
  return { subject, text };
}

async function maybeEmailOfflineOperator(
  account: UserAccount | undefined,
  email: string,
  name: string,
  order: VleOrder | FillerOrder,
  result: DispatchResult,
  roleLabel: string
): Promise<void> {
  if (!email || !isEmailConfigured()) return;
  if (account && !canSendOfflineEmail(account)) return;
  const { subject, text } = buildOrderEmail(order, `Namaste ${name}`);
  const sent = await sendTransactionalEmail({ to: email, subject, text });
  if (sent.ok) {
    result.emails += 1;
    if (account) {
      recordOfflineEmail(account);
      await persistAccount(account);
    }
  } else {
    result.emailErrors.push(`${email}: ${sent.error || 'failed'}`);
  }
  void roleLabel;
}

/**
 * Jan Seva operators ko naya order bhejo.
 * Online → turant in-app socket event.
 * Offline → sirf email (max OPERATOR_MAX_OFFLINE_EMAILS per day, phir online aane tak band).
 */
export async function dispatchNewOrderToVle(
  order: VleOrder,
  operators: VleOperator[],
  routing: DispatchResult['routing']
): Promise<DispatchResult> {
  const result: DispatchResult = {
    inApp: 0,
    emails: 0,
    onlineIds: [],
    offlineIds: [],
    routing,
    emailErrors: []
  };

  for (const operator of operators) {
    const { account, email, name } = operatorEmailTargets(operator);
    const ids = [operator.id, operator.cscId].filter(Boolean).map(String);
    const online = account ? isAccountOnline(account) : false;

    if (online) {
      // Emit to every id room this operator may have joined with.
      ids.forEach(id => emitDispatchEvent(`dispatch:vle-id:${roomId(id)}`, 'dispatch:new-order', { order }));
      result.inApp += 1;
      result.onlineIds.push(...ids);
    } else {
      result.offlineIds.push(...ids);
      await maybeEmailOfflineOperator(account, email, name, order, result, 'Jan Seva Operator');
    }
  }

  return result;
}

/** Form Filler experts ko naya order bhejo (all-India broadcast). */
export async function dispatchNewOrderToFillers(order: VleOrder | FillerOrder): Promise<DispatchResult> {
  const result: DispatchResult = {
    inApp: 0,
    emails: 0,
    onlineIds: [],
    offlineIds: [],
    routing: 'national',
    emailErrors: []
  };

  const fillerAccounts = userAccountsStore.filter(account => account.role === 'filler');
  let anyOnline = false;
  for (const account of fillerAccounts) {
    if (isAccountOnline(account)) {
      anyOnline = true;
      result.inApp += 1;
      result.onlineIds.push(account.id);
      const key = String(account.id || account.phone || '')
        .normalize('NFKC').trim().toLocaleLowerCase('en-IN').replace(/\s+/g, ' ');
      if (key) emitDispatchEvent(`dispatch:filler-id:${key}`, 'dispatch:new-order', { order });
    } else {
      result.offlineIds.push(account.id);
      await maybeEmailOfflineOperator(account, account.email, account.name, order, result, 'Form Filler Expert');
    }
  }
  if (anyOnline) {
    emitDispatchEvent('dispatch:filler-global', 'dispatch:new-order', { order });
  }
  return result;
}

/** Accept hote hi baaki operators ke dashboard se order turant hata do. */
export function dispatchOrderTaken(order: VleOrder | FillerOrder): void {
  const ids = Array.isArray((order as any).availableOperatorIds) ? (order as any).availableOperatorIds : [];
  ids.forEach((id: string) => {
    emitDispatchEvent(`dispatch:vle-id:${roomId(id)}`, 'dispatch:order-taken', { orderId: order.id });
  });
  emitDispatchEvent('dispatch:filler-global', 'dispatch:order-taken', { orderId: order.id });
  const district = normalizeLocation(order.district);
  if (district) {
    emitDispatchEvent(`dispatch:vle-district:${district}`, 'dispatch:order-taken', { orderId: order.id });
    emitDispatchEvent(`dispatch:filler-district:${district}`, 'dispatch:order-taken', { orderId: order.id });
  }
}

/**
 * Order tabhi complete hota hai jab dono ho jayein:
 *   1) Client ka in-app payment confirmed (isPaymentDoneInApp)
 *   2) Operator ne completed form ka final PDF upload kar diya (completedFormPdfUrl)
 * Complete hote hi operator ka active bid slot turant free ho jaata hai.
 */
export async function maybeCompleteOrder(order: any): Promise<boolean> {
  if (!order || order.status === 'completed') return false;
  const paymentDone = Boolean(order.isPaymentDoneInApp);
  const pdfDone = Boolean(order.completedFormPdfUrl);
  if (!paymentDone || !pdfDone) return false;

  order.status = 'completed';
  order.completedAt = new Date().toISOString();
  order.freedAt = order.completedAt;
  order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
  order.chatMessages.push({
    id: 'm-complete-' + Date.now(),
    sender: 'operator',
    senderName: 'DigiSeva',
    text: '✅ Order complete! Payment confirmed aur completed form PDF dono verify ho gaye. Aap ab naya bid le sakte hain.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  emitOrderUpdate(order);
  await persistOrder(order);
  return true;
}
