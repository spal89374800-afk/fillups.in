const EXTRA_ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map(value => value.trim().replace(/\/+$/, ''))
  .filter(Boolean);

export function isAllowedCorsOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true;
    if (host.endsWith('.onrender.com')) return true;
    if (EXTRA_ALLOWED_ORIGINS.includes(parsed.origin)) return true;
    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL;
    if (appUrl) {
      try {
        if (new URL(appUrl).origin === parsed.origin) return true;
      } catch {
        // Ignore malformed APP_URL.
      }
    }
  } catch {
    // Ignore malformed Origin headers.
  }
  return false;
}
