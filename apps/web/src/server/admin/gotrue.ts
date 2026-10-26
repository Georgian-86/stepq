/**
 * The few Supabase Auth (GoTrue) calls the admin login needs, over plain fetch. Server-only, and
 * free of Node imports so `middleware.ts` can use it too. Only the project's public anon (or
 * publishable) key is used; no service key exists anywhere in the app.
 */

export const ACCESS_COOKIE = 'stepq_admin_at';
export const REFRESH_COOKIE = 'stepq_admin_rt';
/** How long a sign-in lasts without a visit; Supabase rotates the tokens on each refresh. */
export const SESSION_MAX_AGE = 7 * 24 * 3600;

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/admin',
  maxAge: SESSION_MAX_AGE,
} as const;

export type AuthUser = { id: string; email: string };
export type AuthSession = { accessToken: string; refreshToken: string; user: AuthUser };

const read = (name: string) => process.env[name]?.trim() ?? '';

/**
 * SUPABASE_URL, or the project URL implied by the pooler user in DATABASE_URL
 * (`postgres.<project-ref>`), so only the anon key needs adding.
 */
export function supabaseUrl(): string {
  const url = read('SUPABASE_URL');
  if (url) return url.replace(/\/+$/, '');
  const ref = /^postgres(?:ql)?:\/\/postgres\.([a-z0-9]+)[:@]/.exec(read('DATABASE_URL'))?.[1];
  return ref ? `https://${ref}.supabase.co` : '';
}

const anonKey = () => read('SUPABASE_ANON_KEY') || read('SUPABASE_PUBLISHABLE_KEY');

export const authConfigured = () => Boolean(supabaseUrl() && anonKey());

async function call(path: string, init: { method?: string; token?: string; body?: unknown }) {
  return fetch(`${supabaseUrl()}/auth/v1${path}`, {
    method: init.method ?? 'GET',
    headers: {
      apikey: anonKey(),
      'Content-Type': 'application/json',
      ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
}

type TokenReply = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email?: string };
};

function toSession(r: TokenReply): AuthSession {
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    user: { id: r.user.id, email: r.user.email ?? '' },
  };
}

/** Email + password sign-in; null when the credentials are wrong. */
export async function signInWithPassword(email: string, password: string) {
  const res = await call('/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
  if (res.status === 400 || res.status === 401 || res.status === 422) return null;
  if (!res.ok) throw new Error(`Supabase Auth sign-in failed (${res.status})`);
  return toSession((await res.json()) as TokenReply);
}

/** A fresh session for a refresh token; null when it was revoked or already used. */
export async function refreshSession(refreshToken: string) {
  const res = await call('/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: refreshToken },
  });
  if (!res.ok) return null;
  return toSession((await res.json()) as TokenReply);
}

/** The user an access token belongs to, checked by Supabase Auth itself (not just decoded). */
export async function getUser(accessToken: string): Promise<AuthUser | null> {
  const res = await call('/user', { token: accessToken });
  if (!res.ok) return null;
  const u = (await res.json()) as { id?: string; email?: string };
  return u.id ? { id: u.id, email: u.email ?? '' } : null;
}

/** Revokes the session's refresh tokens. */
export async function signOut(accessToken: string): Promise<void> {
  await call('/logout', { method: 'POST', token: accessToken }).catch(() => {});
}

/** Seconds until a JWT expires (0 when unreadable). Only to decide when to refresh. */
export function secondsLeft(jwt: string): number {
  try {
    const payload = jwt.split('.')[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload)) as { exp?: number };
    return typeof exp === 'number' ? exp - Date.now() / 1000 : 0;
  } catch {
    return 0;
  }
}
