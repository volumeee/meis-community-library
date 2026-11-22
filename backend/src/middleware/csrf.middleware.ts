import type { Request } from 'express';
import { AppError } from '../errors';

function assertSameOriginHeader(
  rawValue: string | string[],
  expectedHost: string,
  isSecure: boolean,
  label: 'origin' | 'referer'
): void {
  if (!expectedHost) {
    throw new AppError(403, 'Missing Host header.');
  }
  const value = typeof rawValue === 'string' ? rawValue.trim() : '';
  if (!value) {
    throw new AppError(403, `Invalid request ${label}.`);
  }
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new AppError(403, `Invalid request ${label}.`);
  }
  const allowedProtocol = isSecure
    ? parsed.protocol === 'https:'
    : parsed.protocol === 'http:' || parsed.protocol === 'https:';
  if (!allowedProtocol || parsed.host.toLowerCase() !== expectedHost) {
    throw new AppError(403, 'Cross-origin request rejected.');
  }
}

export function assertCsrfOrigin(req: Request): void {
  const customHeader = req.header('x-requested-with');
  if (customHeader !== 'XMLHttpRequest') {
    throw new AppError(403, 'Missing required request header.');
  }

  const secFetchSite = (req.header('sec-fetch-site') || '').trim().toLowerCase();
  if (secFetchSite === 'cross-site') {
    throw new AppError(403, 'Cross-site request rejected.');
  }

  const expectedHost = (req.header('host') || '').trim().toLowerCase();
  if (req.headers.origin !== undefined) {
    assertSameOriginHeader(req.headers.origin, expectedHost, req.secure, 'origin');
  } else if (req.headers.referer !== undefined) {
    assertSameOriginHeader(req.headers.referer, expectedHost, req.secure, 'referer');
  }
}
