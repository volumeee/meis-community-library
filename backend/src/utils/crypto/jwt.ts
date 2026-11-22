import crypto from 'node:crypto';
import { timingSafeStringEqual } from './password';

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
const EPHEMERAL_FALLBACK_SECRET = crypto.randomBytes(32).toString('hex');

export interface AccessTokenPayload {
  sub: string;
  email: string;
  name: string;
  role: 'admin';
  tv: number;
  jti: string;
  iat: number;
  exp: number;
}

export function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecodeToString(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64').toString('utf8');
}

export function getJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured && Buffer.byteLength(configured, 'utf8') >= 32) {
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must contain at least 32 bytes in production.');
  }
  return EPHEMERAL_FALLBACK_SECRET;
}

export function signAccessToken(claims: {
  sub: string;
  email: string;
  name: string;
  role: 'admin';
  tv?: number;
}): { token: string; expiresInSeconds: number } {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: AccessTokenPayload = {
    sub: claims.sub,
    email: claims.email,
    name: claims.name,
    role: claims.role,
    tv: claims.tv ?? 0,
    jti: crypto.randomBytes(12).toString('hex'),
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${header}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(signingInput)
    .digest();
  const encodedSignature = base64UrlEncode(signature);

  return {
    token: `${signingInput}.${encodedSignature}`,
    expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS,
  };
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  if (typeof token !== 'string' || token.length === 0 || token.length > 4096) {
    return null;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  const [encodedHeader, encodedPayload, encodedSig] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSig) {
    return null;
  }

  let parsedHeader: { alg?: unknown; typ?: unknown } | null;
  try {
    parsedHeader = JSON.parse(base64UrlDecodeToString(encodedHeader));
  } catch {
    return null;
  }
  // Strictly enforce HS256 to block alg:none or algorithm confusion attacks
  if (
    !parsedHeader ||
    typeof parsedHeader !== 'object' ||
    parsedHeader.alg !== 'HS256' ||
    parsedHeader.typ !== 'JWT'
  ) {
    return null;
  }

  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', getJwtSecret()).update(signingInput).digest()
  );
  if (!timingSafeStringEqual(encodedSig, expectedSig)) {
    return null;
  }

  let payload: Partial<AccessTokenPayload> | null;
  try {
    payload = JSON.parse(base64UrlDecodeToString(encodedPayload));
  } catch {
    return null;
  }
  if (!payload || typeof payload !== 'object') {
    return null;
  }
  const now = Math.floor(Date.now() / 1000);
  if (
    typeof payload.sub !== 'string' ||
    typeof payload.email !== 'string' ||
    typeof payload.name !== 'string' ||
    payload.role !== 'admin' ||
    typeof payload.tv !== 'number' ||
    !Number.isInteger(payload.tv) ||
    payload.tv < 0 ||
    typeof payload.exp !== 'number' ||
    typeof payload.iat !== 'number' ||
    typeof payload.jti !== 'string'
  ) {
    return null;
  }

  if (payload.exp <= now) {
    return null;
  }

  return payload as AccessTokenPayload;
}
