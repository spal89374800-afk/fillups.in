import { Router } from 'express';
import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import { saveOrUpdateUserAccount, userAccountsStore } from '../services/storeService.ts';
import { readEnvValue } from '../env.ts';
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
  const httpsEmailConfigured = Boolean(
    readEnvValue('BREVO_API_KEY') ||
    readEnvValue('RESEND_API_KEY') ||
    readEnvValue('SENDGRID_API_KEY')
  );
  const smtpConfigured = Boolean(readEnvValue('SMTP_USER') && readEnvValue('SMTP_PASS'));
  res.json({
    success: true,
    turnstileSiteKey: getTurnstileSiteKey() || null,
    turnstileEnabled: isTurnstileEnabled(),
    // Booleans only — never expose keys or credentials.
    emailConfigured: httpsEmailConfigured || smtpConfigured,
    httpsEmailConfigured,
    smtpConfigured
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

  const otpSubject = 'Your DigiSeva Pro login OTP';
  const otpText = `Your DigiSeva Pro login verification code is ${code}. Enter it on the login page. It expires in 10 minutes.`;
  const senderName = 'DigiSeva Pro';
  const deliveryErrors: string[] = [];
  let deliveredVia = '';

  // ========================================================
  // 1) HTTPS EMAIL APIs (work on Render free; SMTP ports are blocked there)
  // ========================================================
  // Render free web services block outbound SMTP ports 25/465/587. An HTTPS
  // provider is the only way to deliver a real OTP from a free instance.
  // Configure ONE of these in the server environment:
  //   BREVO_API_KEY    + BREVO_FROM (recommended: free, verify your Gmail as sender)
  //   RESEND_API_KEY   + RESEND_FROM
  //   SENDGRID_API_KEY + SENDGRID_FROM
  const httpsProviders: Array<{ name: string; send: () => Promise<unknown> }> = [];

  const brevoKey = readEnvValue('BREVO_API_KEY');
  const brevoFrom = readEnvValue('BREVO_FROM') || smtpUser;
  if (brevoKey && brevoFrom) {
    httpsProviders.push({
      name: 'Brevo',
      send: () => fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: brevoFrom },
          to: [{ email: normalizedEmail }],
          subject: otpSubject,
          textContent: otpText
        })
      }).then(async response => {
        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`Brevo HTTP ${response.status}${body ? `: ${body.slice(0, 240)}` : ''}`);
        }
        return response.json().catch(() => ({}));
      })
    });
  }

  const resendKey = readEnvValue('RESEND_API_KEY');
  if (resendKey) {
    const resendFrom = readEnvValue('RESEND_FROM') || 'DigiSeva Pro <onboarding@resend.dev>';
    httpsProviders.push({
      name: 'Resend',
      send: () => fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: resendFrom,
          to: [normalizedEmail],
          subject: otpSubject,
          text: otpText
        })
      }).then(async response => {
        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`Resend HTTP ${response.status}${body ? `: ${body.slice(0, 240)}` : ''}`);
        }
        return response.json().catch(() => ({}));
      })
    });
  }

  const sendgridKey = readEnvValue('SENDGRID_API_KEY');
  const sendgridFrom = readEnvValue('SENDGRID_FROM') || smtpUser;
  if (sendgridKey && sendgridFrom) {
    httpsProviders.push({
      name: 'SendGrid',
      send: () => fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: normalizedEmail }] }],
          from: { email: sendgridFrom, name: senderName },
          subject: otpSubject,
          content: [{ type: 'text/plain', value: otpText }]
        })
      }).then(async response => {
        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw new Error(`SendGrid HTTP ${response.status}${body ? `: ${body.slice(0, 240)}` : ''}`);
        }
        return { ok: true };
      })
    });
  }

  for (const provider of httpsProviders) {
    try {
      await provider.send();
      deliveredVia = provider.name;
      break;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      deliveryErrors.push(`${provider.name}: ${message}`);
      console.error(`[OTP] ${provider.name} delivery failed:`, message);
    }
  }

  // ========================================================
  // 2) SMTP fallback (local dev, or a paid Render instance)
  // ========================================================
  if (!deliveredVia && smtpUser && smtpPass) {
    // 2525 is accepted by some relays (e.g. Brevo) and is not blocked on
    // Render free. Gmail itself only listens on 465/587, so on a free Render
    // instance this branch still cannot deliver — an HTTPS provider above is
    // required for real delivery.
    const configuredPort = Number(process.env.SMTP_PORT || 465);
    const portsToTry = [...new Set([configuredPort, 587, 465, 2525])].filter(port => Number.isFinite(port));
    for (const port of portsToTry) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port,
          secure: port === 465,
          auth: { user: smtpUser, pass: smtpPass },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000
        });
        const mailFrom = readEnvValue('SMTP_FROM') || readEnvValue('BREVO_FROM') || smtpUser;
        await transporter.sendMail({
          from: `"${senderName}" <${mailFrom}>`,
          to: normalizedEmail,
          subject: otpSubject,
          text: otpText
        });
        deliveredVia = 'Gmail SMTP';
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        deliveryErrors.push(`SMTP port ${port}: ${message}`);
        console.error(`[OTP] SMTP port ${port} failed:`, message);
      }
    }
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
