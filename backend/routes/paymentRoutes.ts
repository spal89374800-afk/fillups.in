import { Router } from 'express';
import { consumeOtpVerification } from './authRoutes.ts';
import { findAnyOrder, userAccountsStore, orderBelongsToClient, recordAdminPaymentLedger } from '../services/storeService.ts';
import { buildUpiUri, computeFeeBreakdown, getAdminUpi, getGovtUpi } from '../services/pricingService.ts';
import { getRequestAccount, requireAccount } from '../middleware/securityMiddleware.ts';
import { isRasterImageDataUrl } from '../services/mediaService.ts';
import { emitOrderUpdate } from '../services/realtimeService.ts';
import { PaymentSplits, SplitStatus } from '../types/index.ts';

type OperatorRole = 'vle' | 'filler';
type SplitLeg = 'govt' | 'admin' | 'operator';

interface PayoutProfile {
  role: OperatorRole;
  phone: string;
  email: string;
  upiId: string;
  updatedAt: string;
}

const payoutProfiles = new Map<string, PayoutProfile>();
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
  const profile = payoutProfiles.get(getProfileKey(role, normalizePhone(operator.phone)));
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
  const govt = getGovtUpi();
  const adminUpiUri = admin.upiId
    ? buildUpiUri(admin.upiId, admin.payeeName, breakdown.adminCommission, `Order ${found.order.id} - Admin fee (${breakdown.adminCommissionPercent}%)`)
    : '';
  // Government fee seedha government ke apne UPI par jaata hai — operator ise touch nahi karta.
  // Assigned operator chahe to per-order govt UPI ya govt QR image chat panel se set kar sakta hai;
  // warna global GOVT_UPI_ID fallback use hota hai.
  const orderAny = found.order as any;
  const orderGovtUpiId = typeof orderAny.govtUpiId === 'string' ? orderAny.govtUpiId.trim() : '';
  const orderGovtQrImage = typeof orderAny.govtQrImage === 'string' ? orderAny.govtQrImage : '';
  const effectiveGovtUpiId = orderGovtUpiId || govt.upiId;
  const effectiveGovtName = orderGovtUpiId && orderAny.govtUpiName ? orderAny.govtUpiName : govt.payeeName;
  const govtUpiUri = (!orderGovtQrImage && effectiveGovtUpiId && breakdown.govtFee > 0)
    ? buildUpiUri(effectiveGovtUpiId, effectiveGovtName, breakdown.govtFee, `Order ${found.order.id} - Government fee`)
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
      upiId: profile.upiId,
      amount: breakdown.operatorShare.toFixed(2),
      upiUri: buildUpiUri(profile.upiId, operatorPayeeName, breakdown.operatorShare, `Order ${found.order.id} - Operator share (${breakdown.operatorSharePercent}%)`),
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
    splitPayment: true,
    automaticConfirmation: true
  });
});

paymentRouter.post('/payments/confirm-split', requireAccount(), (req, res) => {
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

  res.json({
    success: true,
    message: fullyPaid
      ? '✅ All payment legs confirmed. Order marked as paid.'
      : adminAutoConfirmed
        ? '✅ Operator legs confirmed and admin fee auto-verified. Waiting for the remaining citizen tick.'
        : `✅ ${requestedLeg} payment leg confirmed. Waiting for the remaining legs.`,
    adminAutoConfirmed,
    fullyPaid,
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
paymentRouter.post('/payments/client-confirm', requireAccount(), (req, res) => {
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

  return res.json({
    success: true,
    message: adminAutoConfirmed
      ? '✅ Admin fee auto-verified. All three legs are now complete.'
      : `✅ ${legLabels[requestedLeg]} payment confirmed by you. The recipient will verify it and mark it received.`,
    clientConfirmed: true,
    adminAutoConfirmed,
    fullyPaid,
    splits,
    order: found.order
  });
});

paymentRouter.post('/orders/:orderId/fees', requireAccount(), (req, res) => {
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
  return res.json({
    success: true,
    changed,
    message: changed
      ? '✅ Fees saved and sent to the citizen. Chat will unlock after the citizen taps OK.'
      : '✅ Fees saved. Waiting for citizen approval.',
    order: found.order
  });
});

paymentRouter.post('/orders/:orderId/approve-fees', requireAccount(), (req, res) => {
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
  return res.json({ success: true, message: '✅ Fees approved. Chat is now unlocked.', order: found.order });
});

paymentRouter.post('/payments/govt-details', requireAccount(), (req, res) => {
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
  const profile = payoutProfiles.get(getProfileKey(role, normalizePhone(account.phone)));
  return res.json({
    success: true,
    profile: profile ? {
      hasSavedDetails: true,
      hasUpiId: Boolean(profile.upiId),
      updatedAt: profile.updatedAt
    } : null
  });
});

paymentRouter.post('/payments/profile', requireAccount(), (req, res) => {
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

  const saved: PayoutProfile = {
    role,
    phone: normalizedPhone,
    email: normalizedEmail,
    upiId,
    updatedAt: new Date().toISOString()
  };
  payoutProfiles.set(getProfileKey(role, normalizedPhone), saved);

  return res.json({
    success: true,
    message: 'UPI ID saved. It will receive this operator’s 83% share QR. The government fee goes directly to the government UPI.',
    profile: {
      hasSavedDetails: true,
      hasUpiId: Boolean(saved.upiId),
      updatedAt: saved.updatedAt
    },
    automaticPayoutsEnabled: false
  });
});
