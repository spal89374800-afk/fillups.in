import { Router } from 'express';
import {
  PIN_LOCK_ATTEMPTS,
  PIN_LOCK_MS,
  applyAccountIdentityChange,
  clearPinFailures,
  hashPin,
  isWeakPin,
  normalizeEmail,
  normalizePhone,
  persistToMongo,
  pinLockRemainingMs,
  registerPinFailure,
  sanitizeAccountForClient,
  userAccountsStore,
  verifyPinHash
} from '../services/storeService.ts';
import type { UserAccount } from '../services/storeService.ts';
import { consumeOtpVerification } from './authRoutes.ts';
import { sendTransactionalEmail } from '../services/emailService.ts';
import { getRequestAccount, requireAccount } from '../middleware/securityMiddleware.ts';

export const accountSecurityRouter = Router();

const PIN_LOCK_MESSAGE = 'Galat PIN ki limit poori ho gayi — account 24 ghante ke liye lock hai. Thodi der baad try karein ya admin/support se sampark karein.';

function securityPayload(account: UserAccount) {
  const lockMs = pinLockRemainingMs(account);
  const attempts = account.pinFailedAttempts || 0;
  return {
    pinSet: Boolean(account.pinHash),
    pinUpdatedAt: account.pinUpdatedAt || null,
    locked: lockMs > 0,
    lockRemainingMs: lockMs,
    lockedUntil: lockMs > 0 ? account.pinLockedUntil : null,
    failedAttempts: attempts,
    attemptsRemaining: lockMs > 0 ? 0 : Math.max(0, PIN_LOCK_ATTEMPTS - attempts)
  };
}

function pinLockResponse(res: any, account: UserAccount) {
  const lockMs = pinLockRemainingMs(account);
  return res.status(423).json({
    success: false,
    pinLocked: true,
    lockRemainingMs: lockMs,
    lockedUntil: account.pinLockedUntil,
    error: PIN_LOCK_MESSAGE
  });
}

function wrongPinResponse(res: any, account: UserAccount, result: { locked: boolean; attemptsRemaining: number }) {
  if (result.locked) {
    return res.status(423).json({
      success: false,
      pinLocked: true,
      lockRemainingMs: PIN_LOCK_MS,
      lockedUntil: account.pinLockedUntil,
      error: PIN_LOCK_MESSAGE
    });
  }
  return res.status(401).json({
    success: false,
    error: `Galat PIN. ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? '' : 's'} baaki hain.`,
    attemptsRemaining: result.attemptsRemaining
  });
}

// ========================================================
// 🔐 GET /account/security — PIN status
// ========================================================
accountSecurityRouter.get('/account/security', requireAccount(), (req, res) => {
  const account = getRequestAccount(req)!;
  if (account.role !== 'vle' && account.role !== 'filler') {
    return res.status(403).json({ success: false, error: 'Security PIN sirf operator accounts ke liye hai.' });
  }
  res.json({ success: true, security: securityPayload(account) });
});

// ========================================================
// 🔐 POST /account/pin/change — purana PIN + naya PIN
// ========================================================
accountSecurityRouter.post('/account/pin/change', requireAccount(), async (req, res) => {
  const account = getRequestAccount(req)!;
  if (account.role !== 'vle' && account.role !== 'filler') {
    return res.status(403).json({ success: false, error: 'Security PIN sirf operator accounts ke liye hai.' });
  }
  if (!account.pinHash) {
    return res.status(409).json({
      success: false,
      pinNotSet: true,
      error: 'Is account par abhi security PIN set nahi hai. Naya account banayein ya admin/support se PIN set karwayein.'
    });
  }
  if (pinLockRemainingMs(account) > 0) {
    return pinLockResponse(res, account);
  }

  const currentPin = String(req.body?.currentPin || '').trim();
  const newPin = String(req.body?.newPin || '').trim();
  if (!verifyPinHash(currentPin, account.pinHash)) {
    return wrongPinResponse(res, account, registerPinFailure(account));
  }
  if (isWeakPin(newPin)) {
    return res.status(400).json({
      success: false,
      weakPin: true,
      error: 'Ye PIN guess karna aasan hai. 6 digit ka koi alag PIN chunein (na 123456, na 111111).'
    });
  }
  if (newPin === currentPin) {
    return res.status(400).json({ success: false, error: 'Naya PIN purane PIN se alag hona chahiye.' });
  }

  account.pinHash = hashPin(newPin);
  account.pinUpdatedAt = new Date().toISOString();
  clearPinFailures(account);
  await persistToMongo('userAccount', account);

  return res.json({
    success: true,
    message: '✅ Security PIN change ho gaya.',
    security: securityPayload(account)
  });
});

// ========================================================
// 🔐 POST /account/identity/change — Gmail/mobile change
// ========================================================
// Gmail change = PIN + nayi Gmail ka OTP (purani Gmail ki zaroorat nahi).
// Mobile change = PIN + alert (SMS OTP abhi enabled nahi hai).
accountSecurityRouter.post('/account/identity/change', requireAccount(), async (req, res) => {
  const account = getRequestAccount(req)!;
  if (account.role !== 'vle' && account.role !== 'filler') {
    return res.status(403).json({ success: false, error: 'Identity change sirf operator accounts ke liye hai.' });
  }
  if (!account.pinHash) {
    return res.status(409).json({
      success: false,
      pinNotSet: true,
      error: 'Is account par security PIN set nahi hai, isliye Gmail/mobile change nahi ho sakta. Naya account banayein ya admin/support se sampark karein.'
    });
  }
  if (pinLockRemainingMs(account) > 0) {
    return pinLockResponse(res, account);
  }

  const pin = String(req.body?.pin || '').trim();
  if (!verifyPinHash(pin, account.pinHash)) {
    return wrongPinResponse(res, account, registerPinFailure(account));
  }

  // PIN sahi hai — ab identity values validate karo.
  clearPinFailures(account);

  const currentEmail = normalizeEmail(account.email);
  const currentPhone = normalizePhone(account.phone);
  const requestedEmail = req.body?.newEmail === undefined ? currentEmail : normalizeEmail(req.body.newEmail);
  const requestedPhone = req.body?.newPhone === undefined ? currentPhone : normalizePhone(req.body.newPhone);
  const emailChanged = !!requestedEmail && requestedEmail !== currentEmail;
  const phoneChanged = !!requestedPhone && requestedPhone !== currentPhone;

  if (!emailChanged && !phoneChanged) {
    return res.status(400).json({ success: false, error: 'Naya Gmail ya mobile number daalein — dono purane jaise hi hain.' });
  }
  if (emailChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail)) {
    return res.status(400).json({ success: false, error: 'Naya Gmail/email sahi nahi hai.' });
  }
  if (phoneChanged && !/^[6-9]\d{9}$/.test(requestedPhone)) {
    return res.status(400).json({ success: false, error: 'Naya mobile number 10 digit ka Indian number hona chahiye.' });
  }

  // Kisi doosre operator ka identity kabhi na le lo.
  const conflict = userAccountsStore.find(other =>
    other !== account &&
    other.role === account.role &&
    (
      (phoneChanged && normalizePhone(other.phone) === requestedPhone) ||
      (emailChanged && normalizeEmail(other.email) === requestedEmail)
    )
  );
  if (conflict) {
    return res.status(409).json({
      success: false,
      error: 'Ye Gmail ya mobile number pehle se kisi doosre operator account par registered hai.'
    });
  }

  // Nayi Gmail verify karna zaroori hai (typo / galat email se bachav).
  if (emailChanged && !consumeOtpVerification(currentPhone, req.body?.otpToken, account.role, requestedEmail)) {
    return res.status(401).json({
      success: false,
      otpRequired: true,
      error: 'Nayi Gmail par bheja gaya OTP verify karein, phir dobara try karein.'
    });
  }

  const change = await applyAccountIdentityChange(account, {
    newEmail: emailChanged ? requestedEmail : undefined,
    newPhone: phoneChanged ? requestedPhone : undefined
  });

  // Owner ko alert — purani aur nayi dono Gmail par. Delivery fail ho to bhi
  // change rollback nahi hoga (email best-effort hai).
  const alertText = [
    `Aapke DigiSeva Pro operator account ki login identity badli gayi hai.`,
    change.emailChanged ? `Gmail: ${change.oldEmail} -> ${change.newEmail}` : '',
    change.phoneChanged ? `Mobile: ${change.oldPhone} -> ${change.newPhone}` : '',
    `Agar ye change aapne nahi kiya, turant admin/support se sampark karein.`
  ].filter(Boolean).join('\n');
  const alertTargets = [...new Set([change.oldEmail, change.newEmail].filter(Boolean))];
  for (const to of alertTargets) {
    void sendTransactionalEmail({
      to,
      subject: 'DigiSeva Pro — account identity changed',
      text: alertText
    }).catch(() => {});
  }

  return res.json({
    success: true,
    message: '✅ Login identity update ho gayi.',
    user: sanitizeAccountForClient(account),
    email: account.email,
    phone: account.phone,
    security: securityPayload(account)
  });
});
