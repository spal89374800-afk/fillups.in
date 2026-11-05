/**
 * Single source of truth for the app language.
 *
 * The SPA stores the language in `localStorage` (EN/HI), while the public SEO
 * pages use the URL (`/hi/services/...`). These helpers keep both in sync so a
 * visitor who lands on a Hindi public page continues in Hindi inside the app.
 */
export type AppLanguage = 'EN' | 'HI';
export type UrlLanguage = 'en' | 'hi';

export const LANGUAGE_STORAGE_KEY = 'app_lang';

export function readStoredLanguage(fallback: AppLanguage = 'EN'): AppLanguage {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === 'HI' || stored === 'EN') return stored;
  } catch {
    // localStorage can be blocked (private mode / embedded webviews).
  }
  return fallback;
}

export function storeLanguage(language: AppLanguage): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage failures; the in-memory state still works.
  }
}

export function applyDocumentLanguage(language: AppLanguage): void {
  document.documentElement.lang = language === 'HI' ? 'hi' : 'en';
}

export function fromUrlLanguage(language: UrlLanguage): AppLanguage {
  return language === 'hi' ? 'HI' : 'EN';
}

export function toUrlLanguage(language: AppLanguage): UrlLanguage {
  return language === 'HI' ? 'hi' : 'en';
}

/**
 * Public pages treat the URL as the source of truth. Persist it so the SPA
 * opens in the same language, and update the document language attribute.
 */
export function applyUrlLanguage(language: UrlLanguage): AppLanguage {
  const appLanguage = fromUrlLanguage(language);
  storeLanguage(appLanguage);
  applyDocumentLanguage(appLanguage);
  return appLanguage;
}
