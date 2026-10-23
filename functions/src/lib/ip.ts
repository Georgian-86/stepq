import type { CallableRequest } from 'firebase-functions/v2/https';

/**
 * Client IP for rate limiting. The leftmost x-forwarded-for hop is supplied by
 * the client, so use the rightmost non-empty hop (appended by Google's front
 * end), falling back to the socket address.
 */
export function clientIp(req: Pick<CallableRequest, 'rawRequest'>): string {
  const raw = req.rawRequest?.headers?.['x-forwarded-for'];
  const header = Array.isArray(raw) ? raw.join(',') : raw;
  const hops = (header ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  return hops[hops.length - 1] || req.rawRequest?.ip || 'unknown';
}
