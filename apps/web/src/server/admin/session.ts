import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { isAdmin } from './data';
import { ACCESS_COOKIE, authConfigured, getUser, type AuthUser } from './gotrue';

export type AdminState =
  | { kind: 'signed-out' }
  | { kind: 'not-admin'; user: AuthUser }
  | { kind: 'admin'; user: AuthUser };

/**
 * Supabase Auth's answer for a token, reused for a short while so clicking around the dashboard
 * does not wait on an Auth round trip per page. Sign-out clears the cookie, so a cached token is
 * only ever presented again by someone who still holds it, within this window.
 */
const USER_TTL_MS = 60_000;
const users = new Map<string, { user: AuthUser | null; until: number }>();

async function userFor(token: string): Promise<AuthUser | null> {
  const key = createHash('sha256').update(token).digest('hex');
  const hit = users.get(key);
  if (hit && hit.until > Date.now()) return hit.user;
  const user = await getUser(token);
  if (users.size > 500) users.clear();
  users.set(key, { user, until: Date.now() + USER_TTL_MS });
  return user;
}

/** Forgets a token (on sign-out). */
export function forgetToken(token: string): void {
  users.delete(createHash('sha256').update(token).digest('hex'));
}

/**
 * Who is signed in to /admin: the access token (kept fresh by `middleware.ts`) is checked with
 * Supabase Auth, then `stepq.is_admin()` decides. Data reads are still filtered by RLS. Cached
 * per request.
 */
export const adminState = cache(async (): Promise<AdminState> => {
  if (!authConfigured()) return { kind: 'signed-out' };
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return { kind: 'signed-out' };
  const user = await userFor(token);
  if (!user) return { kind: 'signed-out' };
  return (await isAdmin(user)) ? { kind: 'admin', user } : { kind: 'not-admin', user };
});

/** For route handlers: the admin user, or null (respond 404 so the route stays unannounced). */
export async function adminUser(): Promise<AuthUser | null> {
  const s = await adminState();
  return s.kind === 'admin' ? s.user : null;
}
