import { Router } from 'express';
import { consumeOtpVerification } from './authRoutes.ts';
import {
  findAnyOrder,
  userAccountsStore,
  orderBelongsToClient,
  recordAdminPaymentLedger,
  persistOrder,
  persistToMongo,
  payoutProfilesStore,
  type PayoutProfile
} from '../services/storeService.ts';
import { buildUpiUri, computeFeeBreakdown, getAdminUpi } from '../services/pricingService.ts';
import { getRequestAccount, requireAccount } from '../middleware/securityMiddleware.ts';
import { isRasterImageDataUrl } from '../services/mediaService.ts';
import { emitOrderUpdate } from '../services/realtimeService.ts';
import { maybeCompleteOrder } from '../services/orderDispatchService.ts';
import { sendTransactionalEmail } from '../services/emailService.ts';
import { readEnvValue } from '../env.ts';
import { PaymentSplits, SplitStatus } from '../types/index.ts';

type OperatorRole = 'vle' | 'filler';
type SplitLeg = 'govt' | 'admin' | 'operator';

// Nayi UPI ko turant payout receive karne se rokta hai. Agar kisi ne account
// takeover karke UPI badal di, to cooling period ke andar paisa divert nahi ho
// sakta. Default 24 ghante, env se override ho sakta hai.
function getPayoutCoolingMs(): number {
  const raw = Number(readEnvValue('PAYOUT_UPI_COOLING_HOURS'));
  const hours = Number.isFinite(raw) && raw >= 0 ? raw : 24;
  return hours * 60 * 60 * 1000;
}

function maskUpiId(upiId: string): string {
  const [name, bank] = String(upiId || '').split('@');
  if (!name || !bank) return upiId;
  return `${name.slice(0, 2)}***@${bank}`;
}

function requestIp(req: any): string {
  const forwarded = req.headers?.['x-forwarded-for'];
  const first = Array.isArray(forwarded) ? forwarded[0] : String(forwarded || '').split(',')[0];
  return String(first || req.ip || req.socket?.remoteAddress || '').trim();
}

function isCoolingActive(profile: PayoutProfile | undefined): boolean {
  if (!profile?.upiCoolingUntil) return false;
  return Date.parse(profile.upiCoolingUntil) > Date.now();
}

export const paymentRouter = Router();

function normalizePhone(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '').slice(-10) : '';
}

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function getProfileKey(role: OperatorRole, phone: string): string {
  return `${role}:${phone}`;
}

function resolveAcceptedOperator(found: NonNullable<ReturnType<typeof findAnyOrder>>) {
  const order = found.order;
  if (order.acceptedByRole === 'jan_seva_vle') {
    return userAccountsStore.find(account =>
      account.role === 'vle' &&
      (
        (order.acceptedByVleId && account.cscId === order.acceptedByVleId) ||
        (order.acceptedById && account.cscId === order.acceptedById)
      )
    );
  }
  if (order.acceptedByRole === 'form_filler_expert') {
    return userAccountsStore.find(account =>
      account.role === 'filler' &&
      (
        (order.acceptedByFillerId && account.id === order.acceptedByFillerId) ||
        (order.acceptedById && account.id === order.acceptedById)
      )
    );
  }
  return undefined;
}

function accountIsAssignedOperator(accountId: string, cscId: string | undefined, operator?: ReturnType<typeof resolveAcceptedOperator>): boolean {
  if (!operator) return false;
  return operator.id === accountId || (!!cscId && operator.cscId === cscId);
}

function ensurePaymentSplits(order: any): PaymentSplits {
  if (!order.paymentSplits || typeof order.paymentSplits !== 'object') {
    order.paymentSplits = {
      govt: { status: 'pending' },
      admin: { status: 'pending' },
      operator: { status: 'pending' }
    };
  }
  for (const leg of ['govt', 'admin', 'operator'] as SplitLeg[]) {
    if (!order.paymentSplits[leg]) {
      order.paymentSplits[leg] = { status: 'pending' };
    }
  }
  return order.paymentSplits as PaymentSplits;
}

function getSplitStatus(order: any, leg: SplitLeg): SplitStatus {
  return order.paymentSplits?.[leg]?.status === 'confirmed' ? 'confirmed' : 'pending';
}

function autoConfirmAdminIfEligible(order: any, operatorName: string): boolean {
  const splits = ensurePaymentSplits(order);
  if (splits.admin.status === 'confirmed') return false;
  const eligible =
    splits.govt.status === 'confirmed' &&
    splits.operator.status === 'confirmed' &&
    Boolean(splits.admin.clientConfirmed);
  if (!eligible) return false;

  const confirmedAt = new Date().toISOString();
  splits.admin = {
    ...splits.admin,
    status: 'confirmed',
    confirmedBy: 'Auto-Verified',
    confirmedAt,
    utr: splits.admin.clientUtr || order.paymentTxnId || 'AUTO-VERIFIED',
    clientConfirmed: true,
    clientConfirmedAt: splits.admin.clientConfirmedAt || confirmedAt
  };

  const breakdown = computeFeeBreakdown(order.amountPaid, order.govtFee);
  recordAdminPaymentLedger({
    orderId: order.id,
    clientName: order.clientName || 'Citizen',
    clientPhone: order.clientPhone || '',
    serviceName: order.formTitle || order.serviceName || 'Digital Service',
    operatorName,
    amount: breakdown.adminCommission,
    status: 'Auto-Verified',
    source: 'Citizen tick + Operator 2 ticks',
    qrNote: `Order ${order.id} - Admin fee`,
    adminUpiId: getAdminUpi().upiId
  });

  order.chatMessages = Array.isArray(order.chatMessages) ? order.chatMessages : [];
  order.chatMessages.push({
    id: 'm-auto-admin-' + Date.now(),
    sender: 'operator',
    senderName: 'DigiSeva Payment',
    text: '✅ Admin fee auto-verified (citizen tick + operator government/share ticks). Admin ledger entry created.',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  return true;
}

function settleIfFullyPaid(order: any): boolean {
  const splits = ensurePaymentSplits(order);
  const allConfirmed = splits.govt.status === 'confirmed' && splits.admin.status === 'confirmed' && splits.operator.status === 'confirmed';
  if (allConfirmed) {
    order.isPaymentDoneInApp = true;
    order.paymentVerificationStatus = 'confirmed';
    if (order.status !== 'completed') {
      order.status = 'paid';
    }
  }
  return allConfirmed;
}

paymentRouter.get('/payments/order-intent/:orderId', requireAccount(), (req, res) => {
  const found = findAnyOrder(req.params.orderId);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  const account = getRequestAccount(req)!;
  const operator = resolveAcceptedOperator(found);
  const isClient = orderBelongsToClient(found.order, account);
  const isOperator = accountIsAssignedOperator(account.id, account.cscId, operator);
  if (!isClient && !isOperator) {
    return res.status(403).json({ success: false, error: 'You do not have access to this order payment.' });
  }
  if (!found.order.acceptedById || !found.order.acceptedByName) {
    return res.status(409).json({ success: false, error: 'An operator must accept this order before UPI payment is available.' });
  }
  if (!operator) return res.status(409).json({ success: false, error: 'The assigned operator profile is unavailable.' });

  const role: OperatorRole = operator.role === 'vle' ? 'vle' : 'filler';
  const profile = payoutProfilesStore.get(getProfileKey(role, normalizePhone(operator.phone)));
  if (!profile?.upiId) {
    return res.status(409).json({ success: false, error: 'The assigned operator has not added a UPI ID yet.' });
  }

  const serviceFeeAmount = Number(found.order.amountPaid);
  if (!Number.isFinite(serviceFeeAmount) || serviceFeeAmount <= 0) {
    return res.status(400).json({ success: false, error: 'This order does not have a valid payment amount.' });
  }
  // Server-side trust gate: payment QRs stay locked until the client approves the work proof.
  // (Sirf frontend lock enough nahi tha — API se bhi ye check zaroori hai.)
  if (!found.order.isProofApprovedByClient) {
    return res.status(409).json({ success: false, error: 'The client must approve the work proof before the payment QR codes are available.' });
  }

  const splits = ensurePaymentSplits(found.order);
  const breakdown = computeFeeBreakdown(serviceFeeAmount, (found.order as any).govtFee);
  const operatorPayeeName = operator.name || found.order.acceptedByName || 'Operator';
  const admin = getAdminUpi();
  const adminUpiUri = admin.upiId
    ? buildUpiUri(admin.upiId, admin.payeeName, breakdown.adminCommission, `Order ${found.order.id} - Admin fee (${breakdown.adminCommissionPercent}%)`)
    : '';
  // Government fee seedha government ke apne UPI par jaata hai — operator ise touch nahi karta.
  // Ab koi global fallback nahi hai: assigned operator har order ke liye govt UPI/QR set karta hai,
  // aur order complete hote hi wo details delete ho jaati hain.
  const orderAny = found.order as any;
  const orderGovtUpiId = typeof orderAny.govtUpiId === 'string' ? orderAny.govtUpiId.trim() : '';
  const orderGovtUpiName = typeof orderAny.govtUpiName === 'string' ? orderAny.govtUpiName.trim() : '';
  const orderGovtQrImage = typeof orderAny.govtQrImage === 'string' ? orderAny.govtQrImage : '';
  const effectiveGovtUpiId = orderGovtUpiId;
  const effectiveGovtName = orderGovtUpiName || 'Government Fee';
  const govtUpiUri = (!orderGovtQrImage && effectiveGovtUpiId && breakdown.govtFee > 0)
    ? buildUpiUri(effectiveGovtUpiId, effectiveGovtName, breakdown.govtFee, `Order ${found.order.id} - Government fee`)
    : '';
  // Cooling ke dauran nayi UPI ki jagah last known good UPI use hoti hai.
  const operatorCooling = isCoolingActive(profile);
  const effectiveOperatorUpiId = operatorCooling && profile.previousUpiId ? profile.previousUpiId : profile.upiId;
  const operatorUpiUri = effectiveOperatorUpiId
    ? buildUpiUri(effectiveOperatorUpiId, operatorPayeeName, breakdown.operatorShare, `Order ${found.order.id} - Operator share (${breakdown.operatorSharePercent}%)`)
    : '';

  const qrs = [
    {
      role: 'government',
      label: 'Government Fee',
      payeeName: effectiveGovtName,
      upiId: effectiveGovtUpiId,
      amount: breakdown.govtFee.toFixed(2),
      upiUri: govtUpiUri,
      qrImage: orderGovtQrImage,
      status: getSplitStatus(found.order, 'govt'),
      confirmedBy: splits.govt.confirmedBy,
      confirmedAt: splits.govt.confirmedAt,
      utr: splits.govt.utr,
      clientConfirmed: Boolean(splits.govt.clientConfirmed),
      clientConfirmedAt: splits.govt.clientConfirmedAt,
      clientUtr: splits.govt.clientUtr
    },
    {
      role: 'admin',
      label: `Admin Fee (${breakdown.adminCommissionPercent}%)`,
      payeeName: admin.payeeName,
      upiId: admin.upiId,
      amount: breakdown.adminCommission.toFixed(2),
      upiUri: adminUpiUri,
      status: getSplitStatus(found.order, 'admin'),
      confirmedBy: splits.admin.confirmedBy,
      confirmedAt: splits.admin.confirmedAt,
      utr: splits.admin.utr,
      clientConfirmed: Boolean(splits.admin.clientConfirmed),
      clientConfirmedAt: splits.admin.clientConfirmedAt,
      clientUtr: splits.admin.clientUtr
    },
    {
      role: 'operator',
      label: role === 'vle' ? 'Jan Seva Operator Share' : 'Form Filler Expert Share',
      payeeName: operatorPayeeName,
      upiId: effectiveOperatorUpiId,
      amount: breakdown.operatorShare.toFixed(2),
      upiUri: operatorUpiUri,
      upiCooling: operatorCooling,
      upiActiveAt: operatorCooling ? profile.upiCoolingUntil : undefined,
      status: getSplitStatus(found.order, 'operator'),
      confirmedBy: splits.operator.confirmedBy,
      confirmedAt: splits.operator.confirmedAt,
      utr: splits.operator.utr,
      clientConfirmed: Boolean(splits.operator.clientConfirmed),
      clientConfirmedAt: splits.operator.clientConfirmedAt,
      clientUtr: splits.operator.clientUtr
    }
  ];

  return res.json({
    success: true,
    paymentMethod: 'split_upi',
    orderId: found.order.id,
    amount: breakdown.total.toFixed(2),
    serviceFee: breakdown.serviceFee.toFixed(2),
    governmentQrUri: govtUpiUri,
    governmentUpiId: effectiveGovtUpiId,
    governmentQrImage: orderGovtQrImage,
    breakdown,
    qrs,
    splits,
    isPaymentDoneInApp: Boolean(found.order.isPaymentDoneInApp),
    adminUpiConfigured: Boolean(admin.upiId),
    govtUpiConfigured: Boolean(effectiveGovtUpiId || orderGovtQrImage),
    governmentUpiRequired: breakdown.govtFee > 0 && !effectiveGovtUpiId && !orderGovtQrImage,
    operatorUpiCooling: operatorCooling,
    operatorUpiActiveAt: operatorCooling ? profile.upiCoolingUntil : undefined,
    splitPayment: true,
    automaticConfirmation: true
  });
});

paymentRouter.post('/payments/confirm-split', requireAccount(), async (req, res) => {
  const { orderId, leg, utr } = req.body;
  const requestedLeg = String(leg || '') as SplitLeg;
  if (requestedLeg === 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin fee is auto-verified. It confirms when the citizen ticks the admin QR and the operator confirms both the government and operator legs.'
    });
  }
  if (requestedLeg !== 'govt' && requestedLeg !== 'operator') {
    return res.status(400).json({ success: false, error: 'Choose a valid operator payment leg: govt or operator.' });
  }
  const found = findAnyOrder(String(orderId || ''));
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });

  const account = getRequestAccount(req)!;
  const operator = resolveAcceptedOperator(found);
  if (!accountIsAssignedOperator(account.id, account.cscId, operator)) {
    return res.status(403).json({ success: false, error: 'Only the assigned operator can confirm this payment leg.' });
  }

  // Server-side trust gate: legs can only be confirmed after the client approves the proof.
  if (!found.order.isProofApprovedByClient) {
    return res.status(409).json({ success: false, error: 'The client must approve the work proof before payment legs can be confirmed.' });
  }

  const splits = ensurePaymentSplits(found.order);
  if (splits[requestedLeg].status === 'confirmed') {
    return res.json({ success: true, alreadyConfirmed: true, message: 'This payment leg is already confirmed.', fullyPaid: Boolean(found.order.isPaymentDoneInApp), order: found.order, splits });
  }

  splits[requestedLeg] = {
    ...splits[requestedLeg],
    status: 'confirmed',
    utr: typeof utr === 'string' && utr.trim() ? utr.trim() : found.order.paymentTxnId,
    confirmedBy: operator?.name || account.name || 'Operator',
    confirmedAt: new Date().toISOString()
  };

  const adminAutoConfirmed = autoConfirmAdminIfEligible(found.order, operator?.name || account.name || 'Operator');
  const fullyPaid = settleIfFullyPaid(found.order);

  if (fullyPaid) {
    found.order.chatMessages = Array.isArray(found.order.chatMessages) ? found.order.chatMessages : [];
    found.order.chatMessages.push({
      id: 'm-paid-' + Date.now(),
      sender: 'operator',
      senderName: 'DigiSeva Payment',
      text: '✅ All three payment legs are confirmed. Payment is complete and your credentials/workflow can now be dispatched.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  }

  // Citizen ke payment panel me turant right-tick dikhna chahiye.
  emitOrderUpdate(found.order);
  await persistOrder(found.order);
  const completed = fullyPaid ? await maybeCompleteOrder(found.order) : false;

  res.json({
    success: true,
    message: fullyPaid
      ? (completed ? '✅ Payment complete + final PDF uploaded — order completed.' : '✅ All payment legs confirmed. Order marked as paid. Ab final form PDF upload karein.')
      : adminAutoConfirmed
        ? '✅ Operator legs confirmed and admin fee auto-verified. Waiting for the remaining citizen tick.'
        : `✅ ${requestedLeg} payment leg confirmed. Waiting for the remaining legs.`,
    adminAutoConfirmed,
    fullyPaid,
    completed,
    splits,
    order: found.order
  });
});

// ========================================================
// ✅ CITIZEN PAYMENT ATTESTATION ("Maine payment kar diya")
// ========================================================
// Citizen har QR leg ke liye apni taraf se confirm kar sakta hai ki usne
// payment kar diya hai. Ye leg ko 'confirmed' NAHI karta — settlement verify
// karne ka right aur duty recipient (operator / admin) ke paas hi rehti hai.
// Isse order khud-ba-khud paid nahi hota; sirf operator ko pata chal jaata
// hai ki paisa bhej diya gaya hai (UTR ke saath).
paymentRouter.post('/payments/client-confirm', requireAccount(), async (req, res) => {
  const { orderId, leg, utr } = req.body;
  const requestedLeg = String(leg || '') as SplitLeg;
  if (requestedLeg !== 'govt' && requestedLeg !== 'admin' && requestedLeg !== 'operator') {
    return res.status(400).json({ success: false, error: 'Choose a valid payment leg: govt, admin, or operator.' });
  }
  const found = findAnyOrder(String(orderId || ''));
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });

  const account = getRequestAccount(req)!;
  if (!orderBelongsToClient(found.order, account)) {
    return res.status(403).json({ success: false, error: 'Only the citizen who owns this order can confirm their own payment.' });
  }
  if (!found.order.isProofApprovedByClient) {
    return res.status(409).json({ success: false, error: 'Approve the work proof before confirming your payment.' });
  }
  if (found.order.isPaymentDoneInApp) {
    return res.status(409).json({ success: false, error: 'This order is already marked as paid.' });
  }

  const splits = ensurePaymentSplits(found.order);
  if (splits[requestedLeg].status === 'confirmed') {
    return res.json({
      success: true,
      alreadyConfirmed: true,
      message: 'This payment leg is already confirmed by the recipient.',
      fullyPaid: Boolean(found.order.isPaymentDoneInApp),
      order: found.order,
      splits
    });
  }

  const cleanUtr = typeof utr === 'string' ? utr.trim().toUpperCase() : '';
  if (cleanUtr && !/^[A-Z0-9]{6,22}$/.test(cleanUtr)) {
    return res.status(400).json({ success: false, error: 'Enter a valid 6–22 character UPI reference / UTR, or leave it blank.' });
  }

  const legLabels: Record<SplitLeg, string> = {
    govt: 'Government Fee',
    admin: 'Admin Fee',
    operator: 'Operator Share'
  };

  splits[requestedLeg] = {
    ...splits[requestedLeg],
    clientConfirmed: true,
    clientConfirmedAt: new Date().toISOString(),
    clientConfirmedBy: found.order.clientName || account.name || 'Citizen',
    clientUtr: cleanUtr || splits[requestedLeg].clientUtr
  };

  found.order.chatMessages = Array.isArray(found.order.chatMessages) ? found.order.chatMessages : [];
  found.order.chatMessages.push({
    id: 'm-client-paid-' + Date.now(),
    sender: 'client',
    senderName: found.order.clientName || account.name || 'Citizen',
    text: `✅ Maine ${legLabels[requestedLeg]} ka payment kar diya hai${cleanUtr ? ` (UTR: ${cleanUtr})` : ''}. Recipient please verify and confirm.`,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });

  const operator = resolveAcceptedOperator(found);
  const adminAutoConfirmed = autoConfirmAdminIfEligible(found.order, operator?.name || 'Operator');
  const fullyPaid = settleIfFullyPaid(found.order);

  // Operator ko turant pata chale ki citizen ne payment claim kar diya hai.
  emitOrderUpdate(found.order);
  await persistOrder(found.order);
  const completed = fullyPaid ? await maybeCompleteOrder(found.order) : false;

  return res.json({
    success: true,
    message: adminAutoConfirmed
      ? '✅ Admin fee auto-verified. All three legs are now complete.'
      : `✅ ${legLabels[requestedLeg]} payment confirmed by you. The recipient will verify it and mark it received.`,
    clientConfirmed: true,
    adminAutoConfirmed,
    fullyPaid,
    completed,
    splits,
    order: found.order
  });
});

paymentRouter.post('/orders/:orderId/fees', requireAccount(), async (req, res) => {
  const found = findAnyOrder(req.params.orderId);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  const account = getRequestAccount(req)!;
  const operator = resolveAcceptedOperator(found);
  if (!accountIsAssignedOperator(account.id, account.cscId, operator)) {
    return res.status(403).json({ success: false, error: 'Only the assigned operator can set fees for this order.' });
  }

  const order = found.order as any;
  if (order.status === 'pending') {
    return res.status(400).json({ success: false, error: 'Accept the request before setting fees.' });
  }

  const govtFeeRaw = req.body?.govtFee;
  const serviceChargeRaw = req.body?.serviceCharge ?? req.body?.formCharge;
  if (govtFeeRaw === undefined || govtFeeRaw === null || String(govtFeeRaw).trim() === '') {
    return res.status(400).json({ success: false, error: 'Enter the government fee (0 is allowed).' });
  }
  if (serviceChargeRaw === undefined || serviceChargeRaw === null || String(serviceChargeRaw).trim() === '') {
    return res.status(400).json({ success: false, error: 'Enter the form / service charge.' });
  }
  const govtFee = Number(govtFeeRaw);
  const serviceCharge = Number(serviceChargeRaw);
  if (!Number.isFinite(govtFee) || govtFee < 0) {
    return res.status(400).json({ success: false, error: 'Government fee must be 0 or more.' });
  }
  if (!Number.isFinite(serviceCharge) || serviceCharge <= 0) {
    return res.status(400).json({ success: false, error: 'Form / service charge must be greater than 0.' });
  }

  const roundedGovtFee = Math.round(govtFee * 100) / 100;
  const roundedServiceCharge = Math.round(serviceCharge * 100) / 100;
  const changed = Number(order.govtFee || 0) !== roundedGovtFee || Number(order.amountPaid || 0) !== roundedServiceCharge;

  order.govtFee = roundedGovtFee;
  order.amountPaid = roundedServiceCharge;
  order.feesApprovalRequired = true;
  order.feesSetAt = new Date().toISOString();
  order.feesSetByRole = order.acceptedByRole;

  if (changed) {
    order.feesApprovedByClient = false;
    order.feesApprovedAt = undefined;
  }

  emitOrderUpdate(found.order);
  await persistOrder(found.order);
  return res.json({
    success: true,
    changed,
    message: changed
      ? '✅ Fees saved and sent to the citizen. Chat will unlock after the citizen taps OK.'
      : '✅ Fees saved. Waiting for citizen approval.',
    order: found.order
  });
});

paymentRouter.post('/orders/:orderId/approve-fees', requireAccount(), async (req, res) => {
  const found = findAnyOrder(req.params.orderId);
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  const account = getRequestAccount(req)!;
  const order = found.order as any;

  if (!orderBelongsToClient(order, account)) {
    return res.status(403).json({ success: false, error: 'Only the citizen who placed this request can approve the fees.' });
  }
  if (!order.feesApprovalRequired) {
    return res.status(400).json({ success: false, error: 'This order does not require fee approval.' });
  }
  if (!order.feesSetAt) {
    return res.status(400).json({ success: false, error: 'The operator has not set the fees yet.' });
  }

  order.feesApprovedByClient = true;
  order.feesApprovedAt = new Date().toISOString();
  emitOrderUpdate(found.order);
  await persistOrder(found.order);
  return res.json({ success: true, message: '✅ Fees approved. Chat is now unlocked.', order: found.order });
});

paymentRouter.post('/payments/govt-details', requireAccount(), async (req, res) => {
  const { orderId, upiId, qrImage, govtFee } = req.body;
  const found = findAnyOrder(String(orderId || ''));
  if (!found) return res.status(404).json({ success: false, error: 'Order not found.' });
  const account = getRequestAccount(req)!;
  const operator = resolveAcceptedOperator(found);
  if (!accountIsAssignedOperator(account.id, account.cscId, operator)) {
    return res.status(403).json({ success: false, error: 'Only the assigned Jan Seva operator or Form Filler Expert can set the government fee, UPI or QR for this order.' });
  }

  const cleanUpi = typeof upiId === 'string' ? upiId.trim().toLowerCase() : '';
  const cleanQr = typeof qrImage === 'string' ? qrImage : '';
  const hasGovtFee = govtFee !== undefined && govtFee !== null && String(govtFee).trim() !== '';
  const parsedGovtFee = hasGovtFee ? Math.max(0, Number(govtFee) || 0) : null;
  if (!cleanUpi && !cleanQr && !hasGovtFee) {
    return res.status(400).json({ success: false, error: 'Enter the government fee, UPI ID or upload the government QR image.' });
  }
  if (cleanUpi && !/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(cleanUpi)) {
    return res.status(400).json({ success: false, error: 'Enter a valid UPI ID, such as treasury@bank.' });
  }
  if (cleanQr && !isRasterImageDataUrl(cleanQr)) {
    return res.status(400).json({ success: false, error: 'Upload a valid JPG, PNG or WebP QR image.' });
  }

  const order = found.order as any;
  const previousGovtFee = Number(order.govtFee || 0);
  if (cleanUpi) order.govtUpiId = cleanUpi;
  if (typeof req.body.upiName === 'string' && req.body.upiName.trim()) {
    order.govtUpiName = req.body.upiName.trim();
  }
  if (cleanQr) order.govtQrImage = cleanQr;
  if (parsedGovtFee !== null) order.govtFee = parsedGovtFee;
  if (parsedGovtFee !== null && previousGovtFee !== parsedGovtFee && order.feesApprovalRequired) {
    order.feesApprovedByClient = false;
    order.feesApprovedAt = undefined;
  }

  // Citizen ke open workspace me QR turant dikhna chahiye — isliye realtime
  // event bhejo (bina page refresh ke QR refresh hoga).
  emitOrderUpdate(found.order);
  await persistOrder(found.order);

  res.json({
    success: true,
    message: '✅ Government fee, UPI and QR saved successfully. The citizen will now see the updated payment details.',
    order: found.order
  });
});

paymentRouter.get('/payments/profile', requireAccount(), (req, res) => {
  const account = getRequestAccount(req)!;
  const role = account.role === 'filler' ? 'filler' : account.role === 'vle' ? 'vle' : null;
  if (!role) return res.status(403).json({ success: false, error: 'Only operator accounts have payout profiles.' });
  const profile = payoutProfilesStore.get(getProfileKey(role, normalizePhone(account.phone)));
  const cooling = isCoolingActive(profile);
  return res.json({
    success: true,
    profile: profile ? {
      hasSavedDetails: true,
      hasUpiId: Boolean(profile.upiId),
      updatedAt: profile.savedAt,
      upiCoolingUntil: cooling ? profile.upiCoolingUntil : undefined,
      upiActive: !cooling
    } : null
  });
});

paymentRouter.post('/payments/profile', requireAccount(), async (req, res) => {
  const account = getRequestAccount(req)!;
  const role: OperatorRole | null = account.role === 'filler' ? 'filler' : account.role === 'vle' ? 'vle' : null;
  if (!role) return res.status(403).json({ success: false, error: 'Only operator accounts have payout profiles.' });
  const normalizedPhone = normalizePhone(account.phone);
  const normalizedEmail = normalizeEmail(account.email);
  if (!/^\d{10}$/.test(normalizedPhone)) {
    return res.status(403).json({ success: false, error: 'A registered operator account is required.' });
  }

  const upiId = typeof req.body.upiId === 'string' ? req.body.upiId.trim().toLowerCase() : '';
  if (!/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(upiId)) {
    return res.status(400).json({ success: false, error: 'Enter a valid UPI ID, such as name@bank.' });
  }
  if (!consumeOtpVerification(account.phone, req.body.verificationToken, role, account.email)) {
    return res.status(401).json({ success: false, error: 'Verify the OTP sent to your registered email (and WhatsApp when enabled) before saving payout details.' });
  }

  const key = getProfileKey(role, normalizedPhone);
  const previous = payoutProfilesStore.get(key);
  const sameUpi = Boolean(previous?.upiId && previous.upiId === upiId);
  const isChange = Boolean(previous?.upiId && !sameUpi);

  // Ek change pehle se cooling me hai to doosra change reject karo — warna
  // attacker chain karke cooling bypass kar sakta hai.
  if (isChange && isCoolingActive(previous)) {
    return res.status(409).json({
      success: false,
      error: `A UPI change is already in security cooling until ${new Date(previous!.upiCoolingUntil!).toLocaleString()}. Please try again after that.`
    });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const coolingMs = getPayoutCoolingMs();
  const coolingUntil = isChange && coolingMs > 0
    ? new Date(now.getTime() + coolingMs).toISOString()
    : undefined;

  const history = Array.isArray(previous?.payoutUpiHistory) ? [...previous!.payoutUpiHistory] : [];
  if (!sameUpi) {
    history.unshift({
      upiId,
      previousUpiId: previous?.upiId || undefined,
      changedAt: nowIso,
      ip: requestIp(req),
      source: 'operator_self_service'
    });
  }

  const saved: PayoutProfile = {
    id: key,
    key,
    role,
    phone: normalizedPhone,
    email: normalizedEmail,
    upiId,
    savedAt: nowIso,
    upiChangedAt: isChange ? nowIso : (previous?.upiChangedAt || nowIso),
    upiCoolingUntil: isChange ? coolingUntil : previous?.upiCoolingUntil,
    previousUpiId: isChange ? previous?.upiId : previous?.previousUpiId,
    payoutUpiHistory: history.slice(0, 20)
  };
  payoutProfilesStore.set(key, saved);
  await persistToMongo('payoutProfile', saved).catch(() => {});

  // UPI change hone par owner ko alert — agar ye change usne nahi kiya to
  // turant report kar sake.
  if (isChange) {
    void sendTransactionalEmail({
      to: normalizedEmail,
      subject: 'Your payout UPI was changed',
      text: [
        `Namaste ${account.name || 'Operator'},`,
        '',
        `Aapki payout UPI ${maskUpiId(previous!.upiId)} se ${maskUpiId(upiId)} par change ho gayi.`,
        `Time: ${new Date(nowIso).toLocaleString()}`,
        coolingUntil ? `Security cooling: nayi UPI ${new Date(coolingUntil).toLocaleString()} tak active nahi hogi. Tab tak purani UPI use hogi.` : '',
        '',
        'Agar ye change aapne nahi kiya, turant support ko report karein.'
      ].filter(Boolean).join('\n')
    }).catch(() => {});
  }

  return res.json({
    success: true,
    message: isChange && coolingUntil
      ? `UPI ID saved. Security cooling active: nayi UPI ${new Date(coolingUntil).toLocaleString()} ke baad payout receive karegi. Tab tak purani UPI active rahegi.`
      : sameUpi
        ? 'UPI ID already saved. No change needed.'
        : 'UPI ID saved. It will receive this operator’s share QR. The government fee goes directly to the government UPI set for this order.',
    profile: {
      hasSavedDetails: true,
      hasUpiId: true,
      updatedAt: saved.savedAt,
      upiCoolingUntil: isCoolingActive(saved) ? saved.upiCoolingUntil : undefined,
      upiActive: !isCoolingActive(saved)
    },
    automaticPayoutsEnabled: false
  });
});
