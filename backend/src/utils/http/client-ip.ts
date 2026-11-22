import { isIP } from 'node:net';
import type { Request } from 'express';

function expandIpv6Groups(ip: string): string[] | null {
  let normalized = ip;
  const lastColon = normalized.lastIndexOf(':');
  if (lastColon !== -1 && normalized.slice(lastColon + 1).includes('.')) {
    const octets = normalized
      .slice(lastColon + 1)
      .split('.')
      .map(Number);
    if (
      octets.length !== 4 ||
      octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
    ) {
      return null;
    }
    const hi = ((octets[0] << 8) | octets[1]).toString(16).padStart(4, '0');
    const lo = ((octets[2] << 8) | octets[3]).toString(16).padStart(4, '0');
    normalized = `${normalized.slice(0, lastColon + 1)}${hi}:${lo}`;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - (left.length + right.length);
  if (halves.length === 1 ? missing !== 0 : missing < 0) return null;

  const full = [...left, ...Array.from({ length: missing }, () => '0'), ...right];
  if (full.length !== 8) return null;
  return full.map((group) => group.padStart(4, '0'));
}

export function normalizeClientIp(rawIp: string | undefined): string {
  if (!rawIp) return 'unknown';
  const trimmed = rawIp.trim().split('%')[0];
  const family = isIP(trimmed);
  if (family === 4) return trimmed;
  if (family !== 6) return 'unknown';

  const groups = expandIpv6Groups(trimmed.toLowerCase());
  if (!groups) return 'unknown';

  if (
    groups[0] === '0000' &&
    groups[1] === '0000' &&
    groups[2] === '0000' &&
    groups[3] === '0000' &&
    groups[4] === '0000' &&
    groups[5] === 'ffff'
  ) {
    const hi = parseInt(groups[6], 16);
    const lo = parseInt(groups[7], 16);
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }

  return `${groups[0]}:${groups[1]}:${groups[2]}:${groups[3]}::/64`;
}

export function getClientKey(req: Request): string {
  const raw = (req.ip || '').trim().split('%')[0];
  const candidate = isIP(raw) ? raw : req.socket.remoteAddress;
  return normalizeClientIp(candidate);
}
