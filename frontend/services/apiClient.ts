// ========================================================
// 🌐 API CLIENT (works from both Render service URLs)
// ========================================================
// The app can be opened from two Render URLs:
//   1. The web service URL that runs Express + the API.
//   2. A static/frontend URL that only serves the built HTML.
//
// If the page is opened from a URL that does NOT have the API, a relative
// `/api/...` request returns the SPA HTML with HTTP 200. We detect that and
// automatically retry the same request against the main backend URL.
//
// The backend always allows the request with CORS (see backend/app.ts).

export const API_FALLBACK_ORIGIN =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ||
  'https://fillups-in.onrender.com';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isJsonResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') || '';
  return contentType.toLowerCase().includes('application/json');
}

function canUseFallback(path: string): boolean {
  if (!path.startsWith('/api/')) return false;
  if (typeof window === 'undefined') return false;
  return window.location.origin !== API_FALLBACK_ORIGIN;
}

/**
 * True for both same-origin `/api/...` paths and absolute backend API URLs.
 * Used by the global fetch wrapper to attach the login token in both cases.
 */
export function isApiRequestUrl(url: string): boolean {
  if (!url) return false;
  return url.startsWith('/api/') || url.startsWith(`${API_FALLBACK_ORIGIN}/api/`);
}

/**
 * Detect a response from a static frontend host (HTML / empty / plain-text 404)
 * instead of the real API. JSON and file responses are never treated as a
 * static-host response, so local document downloads keep working.
 */
export function shouldFallbackToApiOrigin(response: Response): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.origin === API_FALLBACK_ORIGIN) return false;
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('application/json')) return false;
  if (/^(application\/pdf|application\/octet-stream|image\/|audio\/|video\/)/.test(contentType)) {
    return false;
  }
  return true;
}

export async function parseJsonResponse(response: Response): Promise<any> {
  try {
    const text = await response.text();
    if (!text) return {};
    return JSON.parse(text);
  } catch {
    return {};
  }
}

/**
 * Fetch an API endpoint with:
 *  - automatic fallback to the backend URL when a static frontend host answers
 *  - retries for network errors / cold starts (502, 503, 504)
 *
 * 4xx errors (validation, rate limit, wrong OTP) are returned immediately.
 */
export async function fetchWithRetry(
  path: string,
  options: RequestInit = {},
  retries = 2
): Promise<Response> {
  const delays = [1500, 4000];
  let url = path;
  let usingFallback = false;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Static frontend host returned HTML instead of the API -> use backend URL.
      if (!usingFallback && canUseFallback(path) && !isJsonResponse(response)) {
        usingFallback = true;
        url = API_FALLBACK_ORIGIN + path;
        attempt -= 1; // this was not a real failed attempt
        continue;
      }

      // Success, validation error, or rate limit: return immediately.
      if (response.ok || response.status === 429 || response.status < 500) {
        return response;
      }

      // 500/502/503/504 can be a cold start or a transient platform error.
      if (attempt < retries) {
        await sleep(delays[attempt] ?? 3000);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;

      // A CORS/network failure on a static frontend host -> try the backend URL.
      if (!usingFallback && canUseFallback(path)) {
        usingFallback = true;
        url = API_FALLBACK_ORIGIN + path;
        attempt -= 1;
        continue;
      }

      if (attempt < retries) {
        await sleep(delays[attempt] ?? 3000);
        continue;
      }
      throw lastError;
    }
  }

  return fetch(url, options);
}
