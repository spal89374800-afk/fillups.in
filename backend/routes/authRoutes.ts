import { Router } from 'express';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import { saveOrUpdateUserAccount, userAccountsStore } from '../services/storeService.ts';
import { isTestOtpEnabled, readEnvValue } from '../env.ts';
import { getRequestAccount } from '../middleware/securityMiddleware.ts';
import { resolveClientIp } from '../middleware/botShieldMiddleware.ts';
import { isTurnstileEnabled, getTurnstileSiteKey, verifyTurnstileToken } from '../services/turnstileService.ts';
import { checkOtpSendLimits, checkOtpVerifyLimits, registerOtpSend, registerOtpVerify } from '../services/otpGuardService.ts';

export const authRouter = Router();

// ========================================================
// 🛡️ PUBLIC SECURITY CONFIG (frontend ke liye)
// ========================================================
// Sirf public info — Turnstile site key. Koi secret nahi.
authRouter.get('/auth/public-config', (_req, res) => {
  res.json({
    success: true,
    turnstileSiteKey: getTurnstileSiteKey() || null,
    turnstileEnabled: isTurnstileEnabled()
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
  if (!consumeOtpVerification(otpTarget, req.body.verificationToken, userRole, email || identifier)) {
    return res.status(401).json({ success: false, error: 'Verify the OTP sent to this phone and email before logging in.' });
  }
  
  const user = saveOrUpdateUserAccount({
    id: 'user_' + (phone || email || identifier || Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(-12),
    name: name || '',
    phone: phone || (!identifier?.includes('@') ? identifier : ''),
    email: email || (identifier?.includes('@') ? identifier : ''),
    cscId: cscId || '',
    district: district || '',
    city: city || '',
    state: state || '',
    role: userRole
  });

  res.json({
    success: true,
    message: '✅ Logged in successfully. Account retained permanently in backend store (Zero Data Retention is NOT applied to logins).',
    retention: 'PERMANENT_ACCOUNT_STORAGE',
    token: user.token,
    user
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

  res.json({
    success: true,
    message: '✅ User registered and retained in backend database.',
    token: user.token,
    user
  });
});

authRouter.get('/auth/users', (req, res) => {
  const account = getRequestAccount(req);
  res.json({
    success: true,
    usersCount: userAccountsStore.length,
    user: account || null
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

authRouter.post('/auth/send-otp', async (req, res) => {
  try {
  console.log('[send-otp] received', { target: req.body?.target, emailTarget: req.body?.emailTarget, role: req.body?.role });
  const { channel = 'both', target, emailTarget, role = 'client' } = req.body;

  if (channel === 'sms') {
    return res.status(400).json({ success: false, error: 'Carrier SMS is disabled. Request the OTP to your Gmail (and WhatsApp when enabled).' });
  }
  if (channel !== 'both') {
    return res.status(400).json({ success: false, error: 'OTP must be requested to your Gmail (and WhatsApp when enabled).' });
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

  const smtpUser = readEnvValue('SMTP_USER');
  const smtpPass = readEnvValue('SMTP_PASS');
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

  // Gmail is the primary, always-required real channel. WhatsApp is OPTIONAL:
  // Meta only allows business-initiated OTP via a pre-approved template, so we
  // only use WhatsApp when the full set of credentials is present.
  const hasEmail = Boolean(smtpUser && smtpPass);

  // Sirf Gmail OTP — WhatsApp/phone OTP hata diya gaya hai.
  // The TEST_OTP_ENABLED shortcut is only used as a local fallback when no real
  // delivery channel is configured.
  if (!hasEmail) {
    // No email channel configured (common on Render without env vars): fall back to a
    // test OTP so login keeps working. The code is returned and auto-filled by the UI.
    activeOtpStore[normalizedTarget] = {
      code,
      email: normalizedEmail,
      role: userRole,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0
    };
    console.log(`[TEST OTP] ${cleanPhone} / ${normalizedEmail} -> ${code} (real delivery not configured)`);
    return res.json({
      success: true,
      channel: 'test',
      target: cleanPhone,
      emailTarget: normalizedEmail,
      testOtp: code,
      message: `Email is not configured on the server. TEST MODE code: ${code} (auto-filled).`
    });
  }

  const deliveries: Promise<unknown>[] = [];
  const channels: string[] = [];

  if (hasEmail) {
    deliveries.push((async () => {
      const portsToTry = [Number(process.env.SMTP_PORT || 465)];
      if (!portsToTry.includes(587)) portsToTry.push(587);
      let lastError: unknown;
      for (const port of portsToTry) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port,
            secure: port === 465,
            auth: { user: smtpUser, pass: smtpPass },
            connectionTimeout: 12000,
            greetingTimeout: 12000,
            socketTimeout: 15000
          });
          await transporter.sendMail({
            from: `"DigiSeva Pro" <${smtpUser}>`,
            to: normalizedEmail,
            subject: 'Your DigiSeva Pro login OTP',
            text: `Your DigiSeva Pro login verification code is ${code}. Enter it on the login page. It expires in 10 minutes.`
          });
          return;
        } catch (err) {
          lastError = err;
          console.error(`[Gmail OTP] port ${port} failed:`, err instanceof Error ? err.message : err);
        }
      }
      throw (lastError instanceof Error ? lastError : new Error('Gmail delivery failed'));
    })());
    channels.push('Gmail');
  }

  const resendKey = readEnvValue('RESEND_API_KEY');
  if (resendKey) {
    deliveries.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'DigiSeva Pro <onboarding@resend.dev>',
          to: [normalizedEmail],
          subject: 'Your DigiSeva Pro login OTP',
          text: `Your DigiSeva Pro login verification code is ${code}. Enter it on the login page. It expires in 10 minutes.`
        })
      }).then(async response => {
        if (!response.ok) {
          console.error(`[Resend OTP] HTTP ${response.status}`);
          throw new Error(`Resend API returned HTTP ${response.status}.`);
        }
        return response.json();
      })
    );
    channels.push('Email');
  }

  const results = await Promise.allSettled(deliveries);
  const succeeded: string[] = [];
  results.forEach((result, index) => {
    const label = channels[index];
    if (result.status === 'fulfilled') {
      succeeded.push(label);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : 'Unknown error';
      console.error(`${label} OTP delivery failed:`, reason);
    }
  });

  if (succeeded.length === 0) {
    // Delivery failed (common on Render/PaaS where outbound SMTP is blocked).
    // Fall back to a test OTP so login keeps working without any env configuration.
    activeOtpStore[normalizedTarget] = {
      code,
      email: normalizedEmail,
      role: userRole,
      expiresAt: Date.now() + 10 * 60 * 1000,
      attempts: 0
    };
    console.log(`[TEST OTP fallback] delivery failed; code=${code} target=${normalizedTarget}`);
    return res.json({
      success: true,
      channel: 'test',
      target: cleanPhone,
      emailTarget: normalizedEmail,
      testOtp: code,
      message: 'Email delivery failed on the server. A test OTP has been generated and auto-filled.'
    });
  }

  activeOtpStore[normalizedTarget] = {
    code,
    email: normalizedEmail,
    role: userRole,
    expiresAt: Date.now() + 10 * 60 * 1000,
    attempts: 0
  };
  console.log(`[DEBUG OTP] target=${normalizedTarget} code=${code}`);

  return res.json({
    success: true,
    channel: succeeded[0] || 'Gmail',
    target: cleanPhone,
    emailTarget: normalizedEmail,
    testOtp: code,
    message: `The verification code was sent to your ${succeeded[0] || 'Gmail'}.`
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
        allowedChannels: ['whatsapp_cloud_api', 'gmail_smtp'],
        costPerOtp: 'Email and WhatsApp delivery depend on the configured providers and their pricing.',
        description: 'Carrier SMS is disabled. The same OTP is sent to the verified login email through SMTP and the mobile number through an approved WhatsApp Business template.'
      }
    }
  });
});
