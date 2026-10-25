import { readEnvValue } from '../env.ts';

// 🛡️ CLOUDFLARE TURNSTILE (invisible CAPTCHA)
// Bot-proof karega OTP/verify endpoints ko. Agar keys set nahi hain to
// verification skip ho jati hai, taaki local development aaram se chale.
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_TIMEOUT_MS = 8000;

export function getTurnstileSiteKey(): string | undefined {
  return readEnvValue('TURNSTILE_SITE_KEY');
}

export function getTurnstileSecretKey(): string | undefined {
  return readEnvValue('TURNSTILE_SECRET_KEY');
}

export function isTurnstileEnabled(): boolean {
  return Boolean(getTurnstileSiteKey() && getTurnstileSecretKey());
}

export interface TurnstileResult {
  success: boolean;
  reason: string;
  errors: string[];
}

/**
 * Server side Turnstile token validation.
 * Cloudflare ke siteverify endpoint pe POST karke token validate hota hai.
 * Token 5 minute ke andar hi use hota hai (single use).
 */
export async function verifyTurnstileToken(token: unknown, remoteIp?: string): Promise<TurnstileResult> {
  if (!isTurnstileEnabled()) {
    return { success: true, reason: 'turnstile_not_configured', errors: [] };
  }
  if (typeof token !== 'string' || !token.trim()) {
    return { success: false, reason: 'missing_captcha_token', errors: ['missing-input-response'] };
  }

  const secretKey = getTurnstileSecretKey() as string;
  const form = new FormData();
  form.append('secret', secretKey);
  form.append('response', token.trim());
  if (remoteIp) form.append('remoteip', remoteIp);

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: form,
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS)
    });
    if (!response.ok) {
      console.error(`[Turnstile] siteverify returned HTTP ${response.status}.`);
      // Verification server down hai -> request ko mat roko, sirf log karo.
      return { success: true, reason: 'turnstile_unavailable', errors: [] };
    }
    const data = (await response.json()) as {
      success?: boolean;
      'error-codes'?: string[];
      action?: string;
      cdata?: string;
      hostname?: string;
    };
    const errors = Array.isArray(data['error-codes']) ? data['error-codes'] : [];
    if (!data.success) {
      console.warn(`[Turnstile] token rejected: ${errors.join(', ') || 'unknown'}`);
      return { success: false, reason: errors[0] || 'captcha_failed', errors };
    }
    return { success: true, reason: 'ok', errors };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown';
    console.error(`[Turnstile] verification error: ${reason}`);
    return { success: true, reason: 'turnstile_unavailable', errors: [] };
  }
}
