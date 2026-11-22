import type { Request, Response } from 'express';

export const REFRESH_COOKIE_NAME = 'mcl_refresh';

export function parseCookieHeaderValues(
  cookieHeader: string | undefined,
  cookieName: string
): string[] {
  if (!cookieHeader) return [];
  const values: string[] = [];
  for (const pair of cookieHeader.split(';')) {
    const idx = pair.indexOf('=');
    if (idx === -1 || pair.slice(0, idx).trim() !== cookieName) continue;
    const value = pair.slice(idx + 1).trim();
    try {
      values.push(decodeURIComponent(value));
    } catch {
      values.push(value);
    }
    if (values.length === 4) break;
  }
  return [...new Set(values)];
}

export function setRefreshCookie(
  req: Request,
  res: Response,
  rawToken: string,
  maxAgeSeconds: number
): void {
  const parts = [
    `${REFRESH_COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    'Path=/api/auth',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (process.env.NODE_ENV === 'production' || req.secure) {
    parts.push('Secure');
  }

  res.append('Set-Cookie', parts.join('; '));
}

export function clearRefreshCookie(req: Request, res: Response): void {
  const parts = [
    `${REFRESH_COOKIE_NAME}=`,
    'Path=/api/auth',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (process.env.NODE_ENV === 'production' || req.secure) {
    res.append(
      'Set-Cookie',
      `${REFRESH_COOKIE_NAME}=; Path=/api/auth; Max-Age=0; HttpOnly; Secure; SameSite=None`
    );
    res.append(
      'Set-Cookie',
      `${REFRESH_COOKIE_NAME}=; Path=/api/auth; Max-Age=0; HttpOnly; Secure; SameSite=None; Partitioned`
    );
    parts.push('Secure');
  }

  res.append('Set-Cookie', parts.join('; '));
}
