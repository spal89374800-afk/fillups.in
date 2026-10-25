// ========================================================
// 🛡️ OTP REQUEST GUARD (spam + cost protection)
// ========================================================
// OTP bhejne me real paisa lagta hai (WhatsApp Cloud API + Gmail SMTP).
// Bina limit ke koi bot roz 10,000 OTP bhejwa sakta hai. Ye guard:
//   - per phone : 3 / 15 min, 10 / day
//   - per IP    : 5 / hour,   30 / day
//   - verify attempts per IP : 20 / 15 min
//   - verify attempts per phone : 10 / 15 min

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

// Local dev me sab requests 127.0.0.1 se aate hain — IP limit lagane se
// poora dev/testing machine block ho jaata tha (5 OTP/hour). Production me
// Cloudflare ke peeche real client IP aata hai, isliye loopback exemption safe hai.
// Opt-out: OTP_GUARD_TRUST_LOOPBACK=false
const TRUST_LOOPBACK = (process.env.OTP_GUARD_TRUST_LOOPBACK || 'true').toLowerCase() !== 'false';

function isLoopback(ip: string): boolean {
  const clean = ip.trim().toLowerCase().replace(/^::ffff:/, '');
  if (!clean || clean === 'unknown') return false;
  return clean === '::1' || clean === 'localhost' || clean.startsWith('127.');
}

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

function keyOf(scope: string, identity: string): string {
  return `${scope}:${identity}`;
}

function prune(bucket: Bucket, windowMs: number): void {
  const cutoff = Date.now() - windowMs;
  while (bucket.timestamps.length > 0 && bucket.timestamps[0] < cutoff) {
    bucket.timestamps.shift();
  }
}

function countIn(scope: string, identity: string, windowMs: number): number {
  const bucket = buckets.get(keyOf(scope, identity));
  if (!bucket) return 0;
  prune(bucket, windowMs);
  return bucket.timestamps.length;
}

function register(scope: string, identity: string): void {
  const key = keyOf(scope, identity);
  let bucket = buckets.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    buckets.set(key, bucket);
  }
  bucket.timestamps.push(Date.now());
  prune(bucket, ONE_DAY);
}

export interface OtpGuardResult {
  allowed: boolean;
  reason: string;
  retryAfterMinutes?: number;
  message?: string;
}

export interface OtpGuardContext {
  phone: string;
  ip: string;
}

export function checkOtpSendLimits(context: OtpGuardContext): OtpGuardResult {
  const phone = context.phone.replace(/\D/g, '').slice(-10);
  const ip = context.ip;
  const loopback = TRUST_LOOPBACK && isLoopback(ip);

  const phoneQuarterHour = countIn('otp:phone:15m', phone, FIFTEEN_MINUTES);
  if (phoneQuarterHour >= 3) {
    return {
      allowed: false,
      reason: 'phone_15m_limit',
      retryAfterMinutes: 15,
      message: 'Too many codes requested for this mobile number. Please wait 15 minutes and try again.'
    };
  }

  const phoneDaily = countIn('otp:phone:1d', phone, ONE_DAY);
  if (phoneDaily >= 10) {
    return {
      allowed: false,
      reason: 'phone_daily_limit',
      retryAfterMinutes: 1440,
      message: 'Daily limit reached for this mobile number. Please try again tomorrow.'
    };
  }

  if (!loopback) {
    const ipHourly = countIn('otp:ip:1h', ip, ONE_HOUR);
    if (ipHourly >= 5) {
      return {
        allowed: false,
        reason: 'ip_hourly_limit',
        retryAfterMinutes: 60,
        message: 'Too many codes requested from this device. Please wait an hour and try again.'
      };
    }

    const ipDaily = countIn('otp:ip:1d', ip, ONE_DAY);
    if (ipDaily >= 30) {
      return {
        allowed: false,
        reason: 'ip_daily_limit',
        retryAfterMinutes: 1440,
        message: 'Daily limit reached from this device. Please try again tomorrow.'
      };
    }
  }

  return { allowed: true, reason: 'ok' };
}

export function registerOtpSend(context: OtpGuardContext): void {
  const phone = context.phone.replace(/\D/g, '').slice(-10);
  register('otp:phone:15m', phone);
  register('otp:phone:1d', phone);
  register('otp:ip:1h', context.ip);
  register('otp:ip:1d', context.ip);
}

export function checkOtpVerifyLimits(context: OtpGuardContext): OtpGuardResult {
  const phone = context.phone.replace(/\D/g, '').slice(-10);
  const ip = context.ip;

  const ipAttempts = countIn('verify:ip:15m', ip, FIFTEEN_MINUTES);
  if (ipAttempts >= 20) {
    return {
      allowed: false,
      reason: 'ip_verify_limit',
      retryAfterMinutes: 15,
      message: 'Too many verification attempts from this device. Please wait 15 minutes.'
    };
  }

  const phoneAttempts = countIn('verify:phone:15m', phone, FIFTEEN_MINUTES);
  if (phoneAttempts >= 10) {
    return {
      allowed: false,
      reason: 'phone_verify_limit',
      retryAfterMinutes: 15,
      message: 'Too many verification attempts for this mobile number. Please wait 15 minutes.'
    };
  }

  return { allowed: true, reason: 'ok' };
}

export function registerOtpVerify(context: OtpGuardContext): void {
  const phone = context.phone.replace(/\D/g, '').slice(-10);
  register('verify:ip:15m', context.ip);
  register('verify:phone:15m', phone);
}

// Cleanup: purane buckets memory se hatao.
setInterval(() => {
  const cutoff = Date.now() - ONE_DAY;
  buckets.forEach((bucket, key) => {
    prune(bucket, ONE_DAY);
    if (bucket.timestamps.length === 0 || bucket.timestamps[0] < cutoff) buckets.delete(key);
  });
}, 10 * 60 * 1000).unref?.();
