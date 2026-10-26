import { createHmac, timingSafeEqual } from 'node:crypto';
import type { ActionKind } from '@stepq/schemas';
import { env } from './env';
import { ApiError } from './errors';

/** Action links, plus the résumé download link in team-application alerts. */
export type TokenKind = ActionKind | 'resume';
export type TokenPayload = { k: TokenKind; id: string; exp: number };

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');
const mac = (body: string) => createHmac('sha256', env.signingSecret()).update(body).digest();
const denied = () => new ApiError('permission-denied', 'This link is not valid.');

/** `exp` is epoch milliseconds. */
export function signToken(payload: TokenPayload): string {
  const body = b64(JSON.stringify(payload));
  return `${body}.${b64(mac(body))}`;
}

function decode(token: string): Partial<TokenPayload> {
  const [body, sig, ...rest] = token.split('.');
  if (!body || !sig || rest.length > 0) throw denied();
  const given = Buffer.from(sig, 'base64url');
  const expected = mac(body);
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw denied();
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    throw denied();
  }
}

function accept<K extends TokenKind>(
  payload: Partial<TokenPayload>,
  allowed: readonly K[],
): { k: K; id: string } {
  if (
    !payload.k ||
    !(allowed as readonly TokenKind[]).includes(payload.k) ||
    typeof payload.id !== 'string' ||
    typeof payload.exp !== 'number' ||
    payload.exp <= Date.now()
  ) {
    throw denied();
  }
  return { k: payload.k as K, id: payload.id };
}

export function verifyToken(token: string, kind: TokenKind): { id: string } {
  return { id: accept(decode(token), [kind]).id };
}

/** Verifies signature and expiry, then returns the kind/id if the kind is in `allowed`. */
export function verifyAnyToken<K extends TokenKind>(
  token: string,
  allowed: readonly K[],
): { k: K; id: string } {
  return accept(decode(token), allowed);
}
