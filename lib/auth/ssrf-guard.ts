/**
 * SSRF (Server-Side Request Forgery) protection for user-supplied URLs.
 *
 * Anywhere the server fetches a URL that originated from a client
 * (image uploads, inspiration references, webhooks configured by tenants)
 * we must filter the URL so it can't point at:
 *   • loopback (127.0.0.1, ::1, localhost, localhost.localdomain)
 *   • link-local (169.254.0.0/16, fe80::/10)
 *   • private networks (10/8, 172.16/12, 192.168/16, fc00::/7)
 *   • cloud metadata endpoints (169.254.169.254, metadata.google.internal, etc.)
 *   • non-HTTP schemes (file://, data://, javascript:, etc.)
 *
 * Returns the normalized URL on success, or throws SsrfBlockedError.
 * Callers should return 400 to the client.
 */

import { lookup } from 'dns/promises';

export class SsrfBlockedError extends Error {
  constructor(public reason: string) {
    super(`Blocked by SSRF guard: ${reason}`);
    this.name = 'SsrfBlockedError';
  }
}

const BLOCKED_HOSTS_EXACT = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata',
]);

// Regexes for IPv4/IPv6 reserved ranges.
function isPrivateV4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => Number.isNaN(p))) return false;
  const [a, b] = parts;

  if (a === 0) return true;                 // 0.0.0.0/8 current network
  if (a === 10) return true;                // 10/8 private
  if (a === 127) return true;               // 127/8 loopback
  if (a === 169 && b === 254) return true;  // 169.254/16 link-local + AWS/GCP metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16/12 private
  if (a === 192 && b === 168) return true;  // 192.168/16 private
  if (a >= 224) return true;                // multicast + reserved
  return false;
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  // fc00::/7 unique local
  if (/^f[c-d]/.test(lower)) return true;
  // fe80::/10 link-local
  if (/^fe[89ab]/.test(lower)) return true;
  // ff00::/8 multicast
  if (lower.startsWith('ff')) return true;
  return false;
}

/**
 * Validates a URL for safe server-side fetching.
 *
 * Options:
 *   allowedProtocols — default ['https:']. Add 'http:' only for explicitly
 *     trusted legacy sources.
 *   resolveHost — default true. Resolves hostname via DNS and blocks if any
 *     resolved IP is private/reserved. Prevents DNS rebinding.
 */
export async function assertSafeUrl(
  rawUrl: string,
  opts: { allowedProtocols?: string[]; resolveHost?: boolean } = {},
): Promise<URL> {
  const allowed = new Set(opts.allowedProtocols ?? ['https:']);
  const resolveHost = opts.resolveHost ?? true;

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfBlockedError('malformed url');
  }

  if (!allowed.has(url.protocol)) {
    throw new SsrfBlockedError(`disallowed protocol ${url.protocol}`);
  }

  const host = url.hostname.toLowerCase();

  if (BLOCKED_HOSTS_EXACT.has(host)) {
    throw new SsrfBlockedError(`blocked host ${host}`);
  }

  // Raw-IP hostnames — check immediately, no DNS roundtrip
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    if (isPrivateV4(host)) throw new SsrfBlockedError('private ipv4 literal');
  } else if (host.includes(':') || host.startsWith('[')) {
    const stripped = host.replace(/^\[|\]$/g, '');
    if (isPrivateV6(stripped)) throw new SsrfBlockedError('private ipv6 literal');
  }

  // DNS resolve + check every returned address.
  // Without this, an attacker can host a domain that resolves to 10.0.0.1.
  if (resolveHost && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    try {
      const results = await lookup(host, { all: true });
      for (const { address, family } of results) {
        if (family === 4 && isPrivateV4(address)) {
          throw new SsrfBlockedError(`${host} resolves to private ip ${address}`);
        }
        if (family === 6 && isPrivateV6(address)) {
          throw new SsrfBlockedError(`${host} resolves to private ip ${address}`);
        }
      }
    } catch (e) {
      if (e instanceof SsrfBlockedError) throw e;
      // DNS resolution failure isn't necessarily malicious, but we refuse to
      // fetch what we can't verify. Provider hosts should always resolve.
      throw new SsrfBlockedError(`dns resolution failed for ${host}`);
    }
  }

  return url;
}
