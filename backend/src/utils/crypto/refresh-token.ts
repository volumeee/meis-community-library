import crypto from 'node:crypto';
import { base64UrlEncode } from './jwt';

const REFRESH_TOKEN_TTL_DAYS = 7;

export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function generateRefreshToken(maxExpiresAtMs?: number): {
  rawToken: string;
  tokenHash: string;
  expiresAt: string;
  maxAgeSeconds: number;
} {
  const rawToken = base64UrlEncode(crypto.randomBytes(32));
  const tokenHash = hashRefreshToken(rawToken);
  const now = Date.now();
  const defaultExpiresAtMs = now + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  const targetExpiresAtMs =
    maxExpiresAtMs !== undefined
      ? Math.min(defaultExpiresAtMs, maxExpiresAtMs)
      : defaultExpiresAtMs;
  const maxAgeSeconds = Math.max(1, Math.floor((targetExpiresAtMs - now) / 1000));
  const expiresAt = new Date(targetExpiresAtMs).toISOString();
  return { rawToken, tokenHash, expiresAt, maxAgeSeconds };
}
