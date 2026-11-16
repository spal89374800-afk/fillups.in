import type { Response } from 'express';

export const AUTH_SESSION_COOKIE = 'digiseva_session';

const COOKIE_ATTRIBUTES = 'Path=/; HttpOnly; Secure; SameSite=None; Max-Age=604800';

export function setAuthSessionCookie(res: Response, token?: string): void {
  if (!token) throw new Error('Cannot create an authenticated session without an account token.');
  res.append('Set-Cookie', `${AUTH_SESSION_COOKIE}=${encodeURIComponent(token)}; ${COOKIE_ATTRIBUTES}`);
}

export function clearAuthSessionCookie(res: Response): void {
  res.append('Set-Cookie', `${AUTH_SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0`);
}

export function readAuthSessionCookie(cookieHeader?: string): string | undefined {
  if (!cookieHeader) return undefined;
  const value = cookieHeader
    .split(';')
    .map(part => part.trim())
    .find(part => part.startsWith(`${AUTH_SESSION_COOKIE}=`))
    ?.slice(AUTH_SESSION_COOKIE.length + 1);
  if (!value) return undefined;
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
