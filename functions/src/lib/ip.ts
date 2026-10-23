import type { CallableRequest } from 'firebase-functions/v2/https';

/** First hop of x-forwarded-for (the original client). */
export function clientIp(req: Pick<CallableRequest, 'rawRequest'>): string {
  const raw = req.rawRequest?.headers?.['x-forwarded-for'];
  const header = Array.isArray(raw) ? raw[0] : raw;
  const first = header?.split(',')[0]?.trim();
  return first || req.rawRequest?.ip || 'unknown';
}
