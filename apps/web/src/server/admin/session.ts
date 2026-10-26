import { cookies } from 'next/headers';
import { isAdmin } from './data';
import { ACCESS_COOKIE, authConfigured, getUser, type AuthUser } from './gotrue';

export type AdminState =
  | { kind: 'signed-out' }
  | { kind: 'not-admin'; user: AuthUser }
  | { kind: 'admin'; user: AuthUser };

/**
 * Who is signed in to /admin: the access token (kept fresh by `middleware.ts`) is checked with
 * Supabase Auth, then `stepq.is_admin()` decides. Data reads are still filtered by RLS.
 */
export async function adminState(): Promise<AdminState> {
  if (!authConfigured()) return { kind: 'signed-out' };
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!token) return { kind: 'signed-out' };
  const user = await getUser(token);
  if (!user) return { kind: 'signed-out' };
  return (await isAdmin(user)) ? { kind: 'admin', user } : { kind: 'not-admin', user };
}

/** For route handlers: the admin user, or null (respond 404 so the route stays unannounced). */
export async function adminUser(): Promise<AuthUser | null> {
  const s = await adminState();
  return s.kind === 'admin' ? s.user : null;
}
