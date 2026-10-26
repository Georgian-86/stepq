'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addAdmin, asUser, isAdmin, removeAdmin } from '@/server/admin/data';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  authConfigured,
  cookieOptions,
  signInWithPassword,
  signOut,
} from '@/server/admin/gotrue';
import { adminUser } from '@/server/admin/session';
import { ApiError, loggable } from '@/server/errors';
import { clientIp } from '@/server/http';
import { enforceRateLimit } from '@/server/rateLimit';

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (!authConfigured()) return { error: 'Admin sign-in is not set up yet.', email };
  if (!email || !password) return { error: 'Enter your email and password.', email };
  try {
    await enforceRateLimit(clientIp(await headers()), 'admin-login', 10, 900);
    const session = await signInWithPassword(email, password);
    if (!session) return { error: 'Wrong email or password.', email };
    if (!(await isAdmin(session.user))) {
      await signOut(session.accessToken);
      return { error: 'This account does not have admin access.', email };
    }
    const jar = await cookies();
    jar.set(ACCESS_COOKIE, session.accessToken, cookieOptions);
    jar.set(REFRESH_COOKIE, session.refreshToken, cookieOptions);
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message, email };
    console.error('admin login', loggable(e));
    return { error: 'Could not sign in. Try again in a minute.', email };
  }
  redirect('/admin');
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (token) await signOut(token);
  jar.set(ACCESS_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  jar.set(REFRESH_COOKIE, '', { ...cookieOptions, maxAge: 0 });
  redirect('/admin/login');
}

export type AddAdminState = { error?: string; done?: string; email?: string };

export async function addAdminAction(_prev: AddAdminState, form: FormData): Promise<AddAdminState> {
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const user = await adminUser();
  if (!user) return { error: 'Your session has ended. Sign in again.', email };
  try {
    const outcome = await asUser(user, (c) => addAdmin(c, email, password));
    revalidatePath('/admin');
    return {
      done:
        outcome === 'created'
          ? `${email} can now sign in with the password you set.`
          : `${email} already had an account and is now an admin.`,
    };
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message, email };
    console.error('add admin', loggable(e));
    return { error: 'Could not add the admin. Try again in a minute.', email };
  }
}

export async function removeAdminAction(form: FormData): Promise<void> {
  const user = await adminUser();
  if (!user) redirect('/admin/login');
  const target = String(form.get('userId') ?? '');
  await asUser(user, (c) => removeAdmin(c, target)).catch((e) => {
    if (!(e instanceof ApiError)) throw e;
  });
  revalidatePath('/admin');
}
