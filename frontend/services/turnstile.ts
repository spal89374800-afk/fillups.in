import { fetchWithRetry, parseJsonResponse } from './apiClient';
// ========================================================
// 🛡️ CLOUDFLARE TURNSTILE HELPER (frontend)
// ========================================================
// Invisible CAPTCHA. User ko koi click nahi karna padta — bas ek invisible
// check chalta hai jo bot ko rokta hai. Agar TURNSTILE_SITE_KEY set nahi hai
// to token empty string return hota hai aur backend verification skip kar deta hai
// (taaki local development bina keys ke chale).

const TURNSTILE_SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const TURNSTILE_TIMEOUT_MS = 30000;

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  execute: (widgetId?: string) => void;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let siteKeyPromise: Promise<string | null> | null = null;
let scriptPromise: Promise<void> | null = null;

export async function getTurnstileSiteKey(): Promise<string | null> {
  if (!siteKeyPromise) {
    siteKeyPromise = fetchWithRetry('/api/auth/public-config')
      .then(response => (response.ok ? parseJsonResponse(response) : null))
      .then((data: { turnstileSiteKey?: string | null; turnstileEnabled?: boolean } | null) => {
        if (data?.turnstileEnabled && data?.turnstileSiteKey) return data.turnstileSiteKey as string;
        return null;
      })
      .catch(() => null);
  }
  return siteKeyPromise;
}

function loadTurnstileScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.turnstile) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Captcha could not be loaded. Please refresh the page.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Invisible Turnstile token le kar deta hai.
 * - Turnstile configured nahi hai  → '' (backend skip kar dega)
 * - Turnstile fail hua            → error throw (user ko message dikhega)
 */
export async function getCaptchaToken(): Promise<string> {
  const siteKey = await getTurnstileSiteKey();
  if (!siteKey) return '';

  await loadTurnstileScript();

  return new Promise<string>((resolve, reject) => {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.bottom = '16px';
    container.style.right = '16px';
    container.style.zIndex = '2147483647';
    document.body.appendChild(container);

    let settled = false;
    const cleanup = () => {
      try {
        if (window.turnstile && widgetId) window.turnstile.remove(widgetId);
      } catch {
        // Widget already removed.
      }
      container.remove();
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Captcha timed out. Please try again.'));
    }, TURNSTILE_TIMEOUT_MS);

    let widgetId = '';
    try {
      widgetId = window.turnstile!.render(container, {
        sitekey: siteKey,
        execution: 'execute',
        appearance: 'interaction-only',
        callback: (token: string) => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          cleanup();
          resolve(token);
        },
        'error-callback': () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          cleanup();
          reject(new Error('Captcha failed. Please try again.'));
        },
        'timeout-callback': () => {
          if (settled) return;
          settled = true;
          window.clearTimeout(timer);
          cleanup();
          reject(new Error('Captcha timed out. Please try again.'));
        }
      });
      window.turnstile!.execute(widgetId);
    } catch (error) {
      window.clearTimeout(timer);
      settled = true;
      cleanup();
      reject(error instanceof Error ? error : new Error('Captcha failed. Please try again.'));
    }
  });
}
