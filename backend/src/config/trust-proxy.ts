import { isIP } from 'node:net';

export function parseTrustedProxies(rawConfig: string | undefined): string[] | null {
  const trimmed = rawConfig?.trim();
  if (!trimmed) return null;

  const proxies = trimmed.split(',').map((proxy) => proxy.trim());
  for (const proxy of proxies) {
    const [address, prefix, ...extra] = proxy.split('/');
    const family = isIP(address);
    if (
      !family ||
      extra.length > 0 ||
      (prefix !== undefined &&
        (!/^[1-9]\d*$/.test(prefix) || Number(prefix) > (family === 4 ? 32 : 128)))
    ) {
      throw new Error('TRUST_PROXY must contain explicit IP addresses or CIDR ranges.');
    }
  }

  return proxies;
}
