import { fetchWithRetry, parseJsonResponse } from './apiClient';
// ========================================================
// 🔐 GOOGLE SIGN-IN HELPER (frontend)
// ========================================================
// Ye helper Google Identity Services (GSI) ka official button render karta
// hai. Client ID backend ke /api/auth/public-config se aata hai, isliye
// frontend env me kuch add karne ki zaroorat nahi.
//
// Agar GOOGLE_CLIENT_ID server par set nahi hai to helper `false` return
// karta hai aur button UI me show hi nahi hota — OTP flow bilkul normal
// chalta rehta hai.

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

interface GoogleCredentialResponse {
  credential?: string;
  select_by?: string;
}

interface GoogleAccountsId {
  initialize: (config: Record<string, unknown>) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  disableAutoSelect?: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: GoogleAccountsId;
      };
    };
  }
}

let clientIdPromise: Promise<string | null> | null = null;
let scriptPromise: Promise<void> | null = null;

export async function getGoogleClientId(): Promise<string | null> {
  if (!clientIdPromise) {
    clientIdPromise = fetchWithRetry('/api/auth/public-config')
      .then(response => (response.ok ? parseJsonResponse(response) : null))
      .then((data: { googleClientId?: string | null; googleEnabled?: boolean } | null) => {
        if (data?.googleEnabled && data?.googleClientId) return data.googleClientId;
        return null;
      })
      .catch(() => null);
  }
  return clientIdPromise;
}

function loadGoogleScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google sign-in could not be loaded.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google sign-in could not be loaded.'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Google ka official button render karta hai.
 * @returns `true` agar button render hua, `false` agar Google configured nahi hai.
 */
export async function renderGoogleButton(
  container: HTMLElement,
  onCredential: (credential: string) => void
): Promise<boolean> {
  try {
    const clientId = await getGoogleClientId();
    if (!clientId) return false;

    await loadGoogleScript();
    const accountsId = window.google?.accounts?.id;
    if (!accountsId) return false;

    accountsId.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => {
        if (response?.credential) onCredential(response.credential);
      },
      auto_select: false,
      cancel_on_tap_outside: true
    });

    // GSI button width 200-400px ke beech honi chahiye.
    const width = Math.max(200, Math.min(400, Math.floor(container.clientWidth || 320)));
    container.replaceChildren();
    accountsId.renderButton(container, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width
    });
    return true;
  } catch (error) {
    console.warn('[googleAuth] Google button could not be rendered:', error);
    return false;
  }
}
