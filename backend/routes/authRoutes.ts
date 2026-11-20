import { Router } from 'express';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { normalizeEmail, saveOrUpdateUserAccount, sanitizeAccountForClient, userAccountsStore } from '../services/storeService.ts';
import { readEnvValue } from '../env.ts';
import { getRequestAccount } from '../middleware/securityMiddleware.ts';
import { resolveClientIp } from '../middleware/botShieldMiddleware.ts';
import { isTurnstileEnabled, getTurnstileSiteKey, verifyTurnstileToken } from '../services/turnstileService.ts';
import { checkOtpSendLimits, checkOtpVerifyLimits, registerOtpSend, registerOtpVerify } from '../services/otpGuardService.ts';
import { sendTransactionalEmail } from '../services/emailService.ts';
import { clearAuthSessionCookie, setAuthSessionCookie } from '../services/authCookieService.ts';
import { accountBlockedPayload, findBlockedAccountByIdentity } from '../services/accountBlockService.ts';

export const authRouter = Router();

function findClientAccountByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);
  return userAccountsStore.find(account =>
    account.role === 'client' && normalizeEmail(account.email) === normalizedEmail
  );
}

function blockedIdentityResponse(input: { email?: unknown; phone?: unknown; role?: 'client' | 'vle' | 'filler' | 'expert' }) {
  const account = findBlockedAccountByIdentity(input);
  return account ? accountBlockedPayload(account) : null;
}

// ========================================================
// 🛡️ PUBLIC SECURITY CONFIG (frontend ke liye)
// ========================================================
// Sirf public info — Turnstile site key. Koi secret nahi.
authRouter.get('/auth/public-config', (_req, res) => {
  const httpsEmailConfigured = Boolean(
    readEnvValue('BREVO_API_KEY') ||
    readEnvValue('RESEND_API_KEY') ||
    readEnvValue('SENDGRID_API_KEY')
  );
  const smtpConfigured = Boolean(readEnvValue('SMTP_USER') && readEnvValue('SMTP_PASS'));
  // A Google OAuth Client ID is public information (it is sent to the browser
  // by Google's own script), so it is safe to expose here. The secret, if any,
  // is never sent to the client.
  const googleClientId = readEnvValue('GOOGLE_CLIENT_ID') || null;
  res.json({
    success: true,
    turnstileSiteKey: getTurnstileSiteKey() || null,
    turnstileEnabled: isTurnstileEnabled(),
    // Booleans only — never expose keys or credentials.
    emailConfigured: httpsEmailConfigured || smtpConfigured,
    httpsEmailConfigured,
    smtpConfigured,
    googleClientId,
    googleEnabled: Boolean(googleClientId)
  });
});

// ========================================================
// 🛡️ USER AUTH & SESSION PERMANENT RETENTION
// ========================================================
// Per user requirement:
// "Login me backend me zero data retention NA HO, user accounts/sessions persist!"
// "Bas documents send karte hai usme zero data retention ho!"

authRouter.post('/auth/login', (req, res) => {
  const { identifier, phone, email, name, role, cscId, district, city, state } = req.body;
  const userRole = role === 'vle' ? 'vle' : role === 'filler' ? 'filler' : 'client';
  if (userRole !== 'client') {
    return res.status(400).json({ success: false, error: 'Use the dedicated operator or Form Filler login endpoint.' });
  }
  const otpTarget = phone || (!identifier?.includes('@') ? identifier : email || identifier);
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof phone !== 'string' || !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, '')) ||
    typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof district !== 'string' || !district.trim() ||
    typeof city !== 'string' || !city.trim() ||
    typeof state !== 'string' || !state.trim()
  ) {
    return res.status(400).json({ success: false, error: 'All details are required: full name, valid 10-digit mobile number, valid Gmail address, state, district, and city.' });
  }
  const blocked = blockedIdentityResponse({ phone, email: email || identifier, role: userRole });
  if (blocked) return res.status(403).json(blocked);

  if (!consumeOtpVerification(otpTarget, req.body.verificationToken, userRole, email || identifier)) {
    return res.status(401).json({ success: false, error: 'Verify the OTP sent to this phone and email before logging in.' });
  }
  
  const user = saveOrUpdateUserAccount({
    name: name || '',
    phone: phone || (!identifier?.includes('@') ? identifier : ''),
    email: email || (identifier?.includes('@') ? identifier : ''),
    cscId: cscId || '',
    district: district || '',
    city: city || '',
    state: state || '',
    role: userRole
  });

  setAuthSessionCookie(res, user.token);
  res.json({
    success: true,
    message: '✅ Logged in successfully. Account retained permanently in backend store (Zero Data Retention is NOT applied to logins).',
    retention: 'PERMANENT_ACCOUNT_STORAGE',
    user: sanitizeAccountForClient(user)
  });
});

authRouter.post('/auth/register', (req, res) => {
  const { name, phone, email, role, cscId, district, city, state } = req.body;
  const userRole = role === 'vle' ? 'vle' : role === 'filler' ? 'filler' : 'client';
  if (userRole !== 'client') {
    return res.status(400).json({ success: false, error: 'Use the dedicated, OTP-verified registration flow for this portal.' });
  }
  if (
    typeof name !== 'string' || !name.trim() ||
    typeof phone !== 'string' ||
    !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, '')) ||
    typeof email !== 'string' ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof district !== 'string' || !district.trim() ||
    typeof city !== 'string' || !city.trim() ||
    typeof state !== 'string' || !state.trim()
  ) {
    return res.status(400).json({ success: false, error: 'All details are required: full name, valid mobile number, valid email address, state, district, and city.' });
  }
  const blockedOnRegister = blockedIdentityResponse({ phone, email, role: userRole });
  if (blockedOnRegister) return res.status(403).json(blockedOnRegister);

  if (findClientAccountByEmail(email)) {
    return res.status(409).json({
      success: false,
      code: 'ACCOUNT_EXISTS',
      error: 'This Gmail already has a Citizen account. Sign in with Google or Gmail OTP instead.'
    });
  }
  if (!consumeOtpVerification(phone, req.body.verificationToken, userRole, email)) {
    return res.status(401).json({ success: false, error: 'Verify the OTP sent to this phone and email before registering.' });
  }

  const user = saveOrUpdateUserAccount({
    name: name || '',
    phone: phone || '',
    email: email || '',
    cscId: cscId || '',
    district: district || '',
    city: city || '',
    state: state || '',
    role: userRole
  });

  setAuthSessionCookie(res, user.token);
  res.json({
    success: true,
    message: '✅ User registered and retained in backend database.',
    user: sanitizeAccountForClient(user)
  });
});

authRouter.post('/auth/logout', (_req, res) => {
  clearAuthSessionCookie(res);
  res.json({ success: true });
});

authRouter.get('/auth/users', (req, res) => {
  const account = getRequestAccount(req);
  res.json({
    success: true,
    usersCount: userAccountsStore.length,
    user: account ? sanitizeAccountForClient(account) : null
  });
});

// OTPs are short-lived and held only in memory until verification or expiry.
const activeOtpStore: Record<string, { code: string; email: string; role: 'client' | 'vle' | 'filler'; expiresAt: number; attempts: number }> = {};
const verifiedOtpGrants: Record<string, { target: string; email: string; role: 'client' | 'vle' | 'filler'; expiresAt: number }> = {};

export function consumeOtpVerification(target: unknown, token: unknown, role: 'client' | 'vle' | 'filler', email: unknown): boolean {
  if (typeof target !== 'string' || typeof token !== 'string' || typeof email !== 'string') return false;
  const grant = verifiedOtpGrants[token];
  if (
    !grant ||
    grant.expiresAt <= Date.now() ||
    grant.role !== role ||
    grant.target !== target.trim().toLowerCase() ||
    grant.email !== email.trim().toLowerCase()
  ) {
    return false;
  }
  delete verifiedOtpGrants[token];
  return true;
}

authRouter.post('/auth/client-login/send-otp', async (req, res) => {
  try {
  const email = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, error: 'Enter the Gmail used for your Citizen account.' });
  }

  const account = findClientAccountByEmail(email);
  if (!account) {
    return res.status(404).json({
      success: false,
      code: 'ACCOUNT_NOT_FOUND',
      error: 'No Citizen account was found for this Gmail. Create an account first.'
    });
  }
  const blockedForOtp = blockedIdentityResponse({ email, phone: account.phone, role: 'client' });
  if (blockedForOtp) return res.status(403).json(blockedForOtp);

  const clientIp = resolveClientIp(req);
  const captcha = await verifyTurnstileToken(req.body?.captchaToken, clientIp);
  if (!captcha.success) {
    return res.status(403).json({
      success: false,
      error: 'Verification failed. Please refresh the page and try again.'
    });
  }

  const phone = String(account.phone || '').replace(/\D/g, '').slice(-10);
  const otpGuard = checkOtpSendLimits({ phone, ip: clientIp });
  if (!otpGuard.allowed) {
    return res.status(429).json({
      success: false,
      error: otpGuard.message,
      reason: otpGuard.reason,
      retryAfterMinutes: otpGuard.retryAfterMinutes
    });
  }
  registerOtpSend({ phone, ip: clientIp });

  const code = randomInt(1000, 10000).toString();
  const delivery = await sendTransactionalEmail({
    to: account.email,
    subject: 'Your fillupo.in login OTP',
    text: `Your fillupo.in login verification code is ${code}. Enter it on the login page. It expires in 10 minutes.`,
    senderName: 'fillupo.in'
  });
  if (!delivery.ok) {
    console.error('[client-login] OTP email delivery failed:', delivery.error);
    return res.status(502).json({
      success: false,
      code: 'OTP_DELIVERY_FAILED',
      error: 'Could not send the OTP email. Please try again later.'
    });
  }

  activeOtpStore[email] = {
    code,
    email: normalizeEmail(account.email),
    role: 'client',
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0
  };
  return res.json({
    success: true,
    channel: delivery.via || 'Email',
    message: `A verification code was sent to ${account.email}.`
  });
  } catch (error) {
    console.error('[client-login] OTP send failed:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: 'Could not send the verification code. Please try again later.'
      });
    }
  }
});

authRouter.post('/auth/client-login/verify-otp', (req, res) => {
  const email = typeof req.body?.email === 'string' ? normalizeEmail(req.body.email) : '';
  const submittedCode = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  if (!email || !submittedCode) {
    return res.status(400).json({ success: false, error: 'Gmail and OTP code are required.' });
  }

  const account = findClientAccountByEmail(email);
  if (!account) {
    delete activeOtpStore[email];
    return res.status(401).json({ success: false, error: 'The Gmail or OTP is invalid. Request a new code.' });
  }
  const blockedForVerify = blockedIdentityResponse({ email, phone: account.phone, role: 'client' });
  if (blockedForVerify) return res.status(403).json(blockedForVerify);

  const clientIp = resolveClientIp(req);
  const phone = String(account.phone || '').replace(/\D/g, '').slice(-10);
  const verifyGuard = checkOtpVerifyLimits({ phone, ip: clientIp });
  if (!verifyGuard.allowed) {
    return res.status(429).json({
      success: false,
      error: verifyGuard.message,
      reason: verifyGuard.reason,
      retryAfterMinutes: verifyGuard.retryAfterMinutes
    });
  }
  registerOtpVerify({ phone, ip: clientIp });

  const cached = activeOtpStore[email];
  if (!cached || cached.expiresAt <= Date.now() || cached.role !== 'client' || cached.email !== email) {
    delete activeOtpStore[email];
    return res.status(400).json({ success: false, error: 'OTP expired or not found. Request a new code.' });
  }
  if (!/^\d{4}$/.test(submittedCode)) {
    return res.status(400).json({ success: false, error: 'Invalid OTP. Enter the 4-digit code.' });
  }

  cached.attempts += 1;
  const submittedBuffer = Buffer.from(submittedCode);
  const expectedBuffer = Buffer.from(cached.code);
  if (submittedBuffer.length === expectedBuffer.length && timingSafeEqual(submittedBuffer, expectedBuffer)) {
    delete activeOtpStore[email];
    setAuthSessionCookie(res, account.token);
    return res.json({
      success: true,
      verified: true,
      message: 'Logged in successfully.',
      user: sanitizeAccountForClient(account)
    });
  }

  if (cached.attempts >= 5) {
    delete activeOtpStore[email];
    return res.status(429).json({
      success: false,
      error: 'Too many incorrect attempts. Request a new OTP.'
    });
  }
  return res.status(400).json({ success: false, error: 'Invalid OTP. Please check the code and try again.' });
});

// ========================================================
// 🔐 GOOGLE SIGN-IN (additional verification option)
// ========================================================
// OTP flow bilkul waise hi chalta rahega. Ye endpoint Google ka ID token
// server-side verify karta hai aur usi `verifiedOtpGrants` store me ek
// short-lived grant daal deta hai, jise existing /auth/login,
// /vle/login, /vle/register, /filler/login aur /filler/register endpoints
// bina kisi badlav ke consume kar lete hain.
//
// Isse saara purana validation/duplicate/operator-creation logic reuse hota
// hai — Google sirf email verify karta hai, baaki fields compulsory rehti hain.
let googleOAuthClient: OAuth2Client | null = null;

async function verifyGoogleCredential(credential: string, clientId: string) {
  if (!googleOAuthClient) googleOAuthClient = new OAuth2Client();
  const ticket = await googleOAuthClient.verifyIdToken({ idToken: credential, audience: clientId });
  const payload = ticket.getPayload();
  const email = normalizeEmail(payload?.email);
  if (!payload || !email || payload.email_verified !== true) {
    throw new Error('Google account email could not be verified.');
  }
  return {
    email,
    name: payload.name || '',
    picture: payload.picture || ''
  };
}

authRouter.post('/auth/google', async (req, res) => {
  try {
    const clientId = readEnvValue('GOOGLE_CLIENT_ID');
    if (!clientId) {
      return res.status(503).json({
        success: false,
        error: 'Google sign-in is not configured on this server. Please use the Gmail OTP option.'
      });
    }

    const credential = typeof req.body?.credential === 'string' ? req.body.credential.trim() : '';
    if (!credential) {
      return res.status(400).json({ success: false, error: 'Google credential is required.' });
    }

    const roleInput = req.body?.role;
    const userRole: 'client' | 'vle' | 'filler' | null =
      roleInput === 'vle' ? 'vle' : roleInput === 'filler' ? 'filler' : roleInput === 'client' ? 'client' : null;
    if (!userRole) {
      return res.status(400).json({ success: false, error: 'Choose a valid account type.' });
    }

    // Phone is only saved (never verified by SMS), exactly like the OTP flow.
    // Google verifies the email; the mobile number stays a stored detail.
    const enteredDigits = String(req.body?.target || '').replace(/\D/g, '');
    const phone = enteredDigits.length === 12 && enteredDigits.startsWith('91')
      ? enteredDigits.slice(2)
      : enteredDigits;
    if (!/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: 'Enter a valid 10-digit Indian mobile number before continuing with Google.'
      });
    }

    // 🛡️ Brute-force / abuse guard (same buckets as OTP verification).
    const clientIp = resolveClientIp(req);
    const verifyGuard = checkOtpVerifyLimits({ phone, ip: clientIp });
    if (!verifyGuard.allowed) {
      return res.status(429).json({
        success: false,
        error: verifyGuard.message,
        reason: verifyGuard.reason,
        retryAfterMinutes: verifyGuard.retryAfterMinutes
      });
    }
    registerOtpVerify({ phone, ip: clientIp });

    const { email, name, picture } = await verifyGoogleCredential(credential, clientId);
    const blockedForGoogle = blockedIdentityResponse({ email, phone, role: userRole });
    if (blockedForGoogle) return res.status(403).json(blockedForGoogle);

    const verificationToken = randomBytes(32).toString('hex');
    verifiedOtpGrants[verificationToken] = {
      target: phone,
      email,
      role: userRole,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    console.log(`[auth/google] verified ${email} for role=${userRole} phone=${phone}`);
    return res.json({
      success: true,
      verified: true,
      verificationToken,
      email,
      name,
      picture
    });
  } catch (error) {
    console.error('[auth/google] verification failed:', error);
    return res.status(401).json({
      success: false,
      error: 'Google sign-in could not be verified. Please try again or use the Gmail OTP option.'
    });
  }
});

authRouter.post('/auth/client-login/google', async (req, res) => {
  const clientId = readEnvValue('GOOGLE_CLIENT_ID');
  if (!clientId) {
    return res.status(503).json({
      success: false,
      error: 'Google sign-in is not configured on this server. Please use the Gmail OTP option.'
    });
  }

  const credential = typeof req.body?.credential === 'string' ? req.body.credential.trim() : '';
  if (!credential) {
    return res.status(400).json({ success: false, error: 'Google credential is required.' });
  }

  try {
    const { email } = await verifyGoogleCredential(credential, clientId);
    const account = findClientAccountByEmail(email);
    if (!account) {
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        error: 'No Citizen account was found for this Google account. Create an account first.'
      });
    }
    const blockedForClientGoogle = blockedIdentityResponse({ email, phone: account.phone, role: 'client' });
    if (blockedForClientGoogle) return res.status(403).json(blockedForClientGoogle);

    const clientIp = resolveClientIp(req);
    const phone = String(account.phone || '').replace(/\D/g, '').slice(-10);
    const verifyGuard = checkOtpVerifyLimits({ phone, ip: clientIp });
    if (!verifyGuard.allowed) {
      return res.status(429).json({
        success: false,
        error: verifyGuard.message,
        reason: verifyGuard.reason,
        retryAfterMinutes: verifyGuard.retryAfterMinutes
      });
    }
    registerOtpVerify({ phone, ip: clientIp });

    setAuthSessionCookie(res, account.token);
    return res.json({
      success: true,
      message: 'Logged in successfully.',
      user: sanitizeAccountForClient(account)
    });
  } catch (error) {
    console.error('[client-login] Google sign-in failed:', error);
    return res.status(401).json({
      success: false,
      error: 'Google sign-in could not be verified. Please try again or use the Gmail OTP option.'
    });
  }
});

authRouter.post('/auth/send-otp', async (req, res) => {
  try {
  console.log('[send-otp] received', { target: req.body?.target, emailTarget: req.body?.emailTarget, role: req.body?.role });
  const { channel = 'both', target, emailTarget, role = 'client' } = req.body;

  if (channel === 'sms' || channel !== 'both') {
    return res.status(400).json({ success: false, error: 'OTP is sent to your Gmail only. Request a new code to continue.' });
  }
  if (typeof target !== 'string' || !target.trim() || typeof emailTarget !== 'string' || !emailTarget.trim()) {
    return res.status(400).json({ success: false, error: 'Both a mobile number and email address are required.' });
  }

  const normalizedTarget = target.trim().toLowerCase();
  const normalizedEmail = emailTarget.trim().toLowerCase();
  if (!['client', 'vle', 'filler'].includes(role)) {
    return res.status(400).json({ success: false, error: 'Choose a valid account type.' });
  }
  const userRole = role === 'vle' ? 'vle' : role === 'filler' ? 'filler' : 'client';
  const enteredPhone = normalizedTarget.replace(/\D/g, '');
  const cleanPhone = enteredPhone.length === 12 && enteredPhone.startsWith('91')
    ? enteredPhone.slice(2)
    : enteredPhone;
  if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
    return res.status(400).json({ success: false, error: 'Enter a valid 10-digit Indian mobile number.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ success: false, error: 'Enter a valid Gmail/email address.' });
  }
  const blockedForSendOtp = blockedIdentityResponse({ phone: cleanPhone, email: normalizedEmail, role: userRole });
  if (blockedForSendOtp) return res.status(403).json(blockedForSendOtp);
  if (userRole === 'client' && findClientAccountByEmail(normalizedEmail)) {
    return res.status(409).json({
      success: false,
      code: 'ACCOUNT_EXISTS',
      error: 'This Gmail already has a Citizen account. Sign in with Google or Gmail OTP instead.'
    });
  }

  const code = randomInt(1000, 10000).toString();

  // 🛡️ CAPTCHA (Cloudflare Turnstile) — bot ko OTP bhejne se rokta hai.
  const clientIp = resolveClientIp(req);
  const captcha = await verifyTurnstileToken(req.body?.captchaToken, clientIp);
  if (!captcha.success) {
    return res.status(403).json({
      success: false,
      error: 'Verification failed. Please refresh the page and try again.'
    });
  }

  // 🛡️ OTP spam / cost guard — per phone aur per IP dono.
  const otpGuard = checkOtpSendLimits({ phone: cleanPhone, ip: clientIp });
  if (!otpGuard.allowed) {
    return res.status(429).json({
      success: false,
      error: otpGuard.message,
      reason: otpGuard.reason,
      retryAfterMinutes: otpGuard.retryAfterMinutes
    });
  }
  registerOtpSend({ phone: cleanPhone, ip: clientIp });

  delete activeOtpStore[normalizedTarget];

  const otpSubject = 'Your fillupo.in login OTP';
  const otpText = `Your fillupo.in login verification code is ${code}. Enter it on the login page. It expires in 10 minutes.`;
  const senderName = 'fillupo.in';
  const deliveryErrors: string[] = [];
  let deliveredVia = '';

  // Brevo / Resend / SendGrid (HTTPS, Render-safe) → SMTP fallback.
  // Saare providers ek hi service me handle hote hain (emailService.ts).
  const delivery = await sendTransactionalEmail({
    to: normalizedEmail,
    subject: otpSubject,
    text: otpText,
    senderName
  });
  if (delivery.ok) {
    deliveredVia = delivery.via || 'Email';
  } else if (delivery.error) {
    deliveryErrors.push(delivery.error);
    console.error('[OTP] email delivery failed:', delivery.error);
  }

  if (!deliveredVia) {
    const runningOnRender = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL || process.env.RENDER_SERVICE_ID);
    console.error('[send-otp] all delivery channels failed:', deliveryErrors.join(' | '));
    return res.status(502).json({
      success: false,
      code: 'OTP_DELIVERY_FAILED',
      error: runningOnRender
        ? 'OTP email nahi bhej paaya. Render free plan SMTP block karta hai. Server par BREVO_API_KEY (free) ya RESEND_API_KEY set karna zaroori hai.'
        : 'OTP email nahi bhej paaya. Server ki SMTP/email provider settings check karein.',
      details: deliveryErrors
    });
  }

  activeOtpStore[normalizedTarget] = {
    code,
    email: normalizedEmail,
    role: userRole,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0
  };
  console.log(`[send-otp][DEBUG] OTP CODE=${code} for target=${normalizedTarget} email=${normalizedEmail} role=${userRole}`);
  console.log(`[send-otp] delivered via ${deliveredVia} to ${normalizedEmail} (target ${cleanPhone})`);

  return res.json({
    success: true,
    channel: deliveredVia,
    target: cleanPhone,
    emailTarget: normalizedEmail,
    message: `Verification code aapke Gmail (${normalizedEmail}) par bheja gaya hai. Phone ke Gmail app me check karein.`
  });
  } catch (error) {
    console.error('[send-otp] unexpected error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ success: false, error: 'Could not send the verification code. Please try again.' });
    }
  }
});

// Verify OTP
authRouter.post('/auth/verify-otp', (req, res) => {
  const { target, code } = req.body;
  if (!target || !code) {
    return res.status(400).json({ success: false, error: 'Target and OTP code are required' });
  }

  const normalizedTarget = String(target).trim().toLowerCase();

  // 🛡️ Brute-force guard — per IP aur per phone dono.
  const verifyGuard = checkOtpVerifyLimits({ phone: String(target), ip: resolveClientIp(req) });
  if (!verifyGuard.allowed) {
    return res.status(429).json({
      success: false,
      verified: false,
      error: verifyGuard.message,
      reason: verifyGuard.reason,
      retryAfterMinutes: verifyGuard.retryAfterMinutes
    });
  }
  registerOtpVerify({ phone: String(target), ip: resolveClientIp(req) });

  const cached = activeOtpStore[normalizedTarget];
  if (cached) {
    const blockedForOtpGrant = blockedIdentityResponse({ email: cached.email, phone: normalizedTarget, role: cached.role });
    if (blockedForOtpGrant) {
      delete activeOtpStore[normalizedTarget];
      return res.status(403).json(blockedForOtpGrant);
    }
  }

  if (!cached || cached.expiresAt <= Date.now()) {
    delete activeOtpStore[normalizedTarget];
    return res.status(400).json({
      success: false,
      verified: false,
      error: 'OTP expired or not found. Request a new code.'
    });
  }

  const submittedCode = String(code).trim();
  if (!/^\d{4}$/.test(submittedCode)) {
    return res.status(400).json({ success: false, verified: false, error: 'Invalid OTP. Enter the 4-digit code.' });
  }

  cached.attempts += 1;
  const submittedBuffer = Buffer.from(submittedCode);
  const expectedBuffer = Buffer.from(cached.code);
  const isValid = submittedBuffer.length === expectedBuffer.length && timingSafeEqual(submittedBuffer, expectedBuffer);
  if (isValid) {
    const verificationToken = randomBytes(32).toString('hex');
    verifiedOtpGrants[verificationToken] = {
      target: normalizedTarget,
      email: cached.email,
      role: cached.role,
      expiresAt: Date.now() + 5 * 60 * 1000
    };
    delete activeOtpStore[normalizedTarget];
    return res.json({
      success: true,
      verified: true,
      verificationToken,
      message: 'OTP verified successfully.'
    });
  }

  if (cached.attempts >= 5) {
    delete activeOtpStore[normalizedTarget];
    return res.status(429).json({
      success: false,
      verified: false,
      error: 'Too many incorrect attempts. Request a new OTP.'
    });
  }

  return res.status(400).json({
    success: false,
    verified: false,
    error: 'Invalid OTP. Please check the code and try again.'
  });
});

// Privacy & Retention Policy endpoint explaining the dual policy requested by the user
authRouter.get('/auth/retention-policy', (_req, res) => {
  res.json({
    success: true,
    policies: {
      userLogins: {
        zeroDataRetention: false,
        retentionMode: 'PERMANENT',
        description: 'User logins, sessions, and profile accounts are permanently retained so users remain authenticated and their accounts are not purged.'
      },
      documentUploads: {
        zeroDataRetention: true,
        retentionMode: 'EPHEMERAL_STREAM_PURGED',
        description: 'Uploaded documents, application files, and attachments are processed strictly with Zero Data Retention (ZDR). Never permanently retained on server disks.'
      },
      otpDelivery: {
        smsDisabled: true,
        allowedChannels: ['gmail_smtp', 'https_email_api'],
        costPerOtp: 'Gmail SMTP or HTTPS email API delivery depends on the configured provider and its pricing.',
        description: 'Carrier SMS and WhatsApp OTP are disabled. The OTP is sent to the verified login Gmail address through SMTP or an HTTPS email API.'
      }
    }
  });
});
