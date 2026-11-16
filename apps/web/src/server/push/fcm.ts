import { createSign } from 'node:crypto';
import { env } from '../env';

/**
 * Sends push notifications through Firebase Cloud Messaging (HTTP v1), signing in with the
 * Firebase service account in FIREBASE_SERVICE_ACCOUNT (server-only, set on Vercel). No SDK:
 * a signed JWT is swapped for a one-hour access token, which is reused until near expiry.
 *
 * Messages are data-only, so the app's StepqMessagingService always builds the notification
 * itself (channel, big text, picture, where a tap goes), in the foreground and the background.
 */

type ServiceAccount = { project_id: string; client_email: string; private_key: string };

const SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** The service account, from raw JSON or base64 JSON; null when push is not set up. */
export function serviceAccount(raw = env.firebaseServiceAccount()): ServiceAccount | null {
  if (!raw) return null;
  const text = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  let parsed: Partial<ServiceAccount>;
  try {
    parsed = JSON.parse(text) as Partial<ServiceAccount>;
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not the service account JSON');
  }
  const { project_id, client_email, private_key } = parsed;
  if (!project_id || !client_email || !private_key) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is missing project_id, client_email or private_key');
  }
  // Pasted into an env var, the key's line breaks often arrive as literal "\n".
  return { project_id, client_email, private_key: private_key.replace(/\\n/g, '\n') };
}

export const pushConfigured = () => {
  try {
    return serviceAccount() !== null;
  } catch {
    return false;
  }
};

const b64url = (v: string | Buffer) => Buffer.from(v).toString('base64url');

/** The signed assertion Google's token endpoint swaps for an access token. */
export function signedAssertion(sa: ServiceAccount, nowSec = Math.floor(Date.now() / 1000)) {
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: nowSec,
      exp: nowSec + 3600,
    }),
  );
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  return `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;
}

let cached: { token: string; until: number; email: string } | undefined;

async function accessToken(sa: ServiceAccount): Promise<string> {
  if (cached && cached.email === sa.client_email && cached.until > Date.now()) return cached.token;
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: signedAssertion(sa),
    }),
  });
  if (!res.ok) throw new Error(`Firebase sign-in failed (${res.status})`);
  const body = (await res.json()) as { access_token: string; expires_in?: number };
  cached = {
    token: body.access_token,
    email: sa.client_email,
    until: Date.now() + Math.max(60, (body.expires_in ?? 3600) - 300) * 1000,
  };
  return cached.token;
}

/** Tests only: forgets the cached access token. */
export function resetFcmToken() {
  cached = undefined;
}

/** What the app reads from a push (all strings: FCM data values must be). */
export type PushData = {
  title: string;
  body: string;
  /** Android channel: nudges, water or news. */
  channel: string;
  /** Kind of push, for the app's analytics and grouping. */
  kind: string;
  /** Optional https picture shown expanded. */
  image?: string;
  /** Where a tap opens: home, friends, groups, qrun, challenges, profile. */
  route?: string;
};

/** ok: delivered to FCM; gone: the token is dead (uninstalled / signed out), delete it. */
export type SendResult = 'ok' | 'gone' | 'failed';

export async function sendPush(
  token: string,
  data: PushData,
  sa = serviceAccount(),
): Promise<SendResult> {
  if (!sa) throw new Error('Push is not set up (FIREBASE_SERVICE_ACCOUNT)');
  const clean = Object.fromEntries(
    Object.entries(data).filter(
      (e): e is [string, string] => typeof e[1] === 'string' && e[1] !== '',
    ),
  );
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${await accessToken(sa)}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token,
        data: clean,
        // High priority so a data message wakes the app to show it; dropped after 6 hours, as
        // a "drink water" from this morning means nothing tonight.
        android: { priority: 'HIGH', ttl: '21600s' },
      },
    }),
  });
  if (res.ok) return 'ok';
  if (res.status === 401) resetFcmToken();
  const err = (await res.json().catch(() => null)) as {
    error?: { status?: string; details?: { errorCode?: string }[] };
  } | null;
  const codes = [err?.error?.status, ...(err?.error?.details ?? []).map((d) => d.errorCode)];
  if (res.status === 404 || codes.includes('UNREGISTERED')) return 'gone';
  if (
    res.status === 400 &&
    codes.includes('INVALID_ARGUMENT') &&
    /token/i.test(JSON.stringify(err))
  ) {
    return 'gone';
  }
  return 'failed';
}

/** Runs `fn` over `items`, at most `limit` at a time. */
export async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}
