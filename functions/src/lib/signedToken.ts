import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ActionKind } from '@stepq/schemas';
import { HttpsError } from 'firebase-functions/v2/https';
import { ACTION_SIGNING_SECRET } from '../config';

export type TokenPayload = { k: ActionKind; id: string; exp: number };

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const mac = (body: string) =>
  createHmac('sha256', ACTION_SIGNING_SECRET.value()).update(body).digest();
const denied = () => new HttpsError('permission-denied', 'This link is not valid.');

/** `exp` is epoch milliseconds. */
export function signToken(payload: TokenPayload): string {
  const body = b64(JSON.stringify(payload));
  return `${body}.${b64(mac(body))}`;
}

export function verifyToken(token: string, kind: ActionKind): { id: string } {
  const [body, sig, ...rest] = token.split('.');
  if (!body || !sig || rest.length > 0) throw denied();
  const given = Buffer.from(sig, 'base64url');
  const expected = mac(body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw denied();
  let payload: Partial<TokenPayload>;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw denied();
  }
  if (
    payload.k !== kind ||
    typeof payload.id !== 'string' ||
    typeof payload.exp !== 'number' ||
    payload.exp <= Date.now()
  ) {
    throw denied();
  }
  return { id: payload.id };
}
