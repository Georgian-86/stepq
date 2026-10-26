'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { addAdmin, asUser, deleteAdmin, isAdmin, updateAdmin } from '@/server/admin/data';
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
  const name = String(form.get('name') ?? '').trim();
  const password = String(form.get('password') ?? '');
  const user = await adminUser();
  if (!user) return { error: 'Your session has ended. Sign in again.', email };
  try {
    const outcome = await asUser(user, async (c) => {
      const result = await addAdmin(c, email, password);
      if (name) {
        const { rows } = await c.query<{ user_id: string }>(
          'select user_id from stepq.admins where email = lower(trim($1))',
          [email],
        );
        if (rows[0]) await updateAdmin(c, rows[0].user_id, { name });
      }
      return result;
    });
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

export type EditAdminState = { error?: string };

export async function updateAdminAction(
  _prev: EditAdminState,
  form: FormData,
): Promise<EditAdminState> {
  const user = await adminUser();
  if (!user) return { error: 'Your session has ended. Sign in again.' };
  const target = String(form.get('userId') ?? '');
  try {
    await asUser(user, (c) =>
      updateAdmin(c, target, {
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      }),
    );
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    console.error('update admin', loggable(e));
    return { error: 'Could not save. Try again in a minute.' };
  }
  revalidatePath('/admin');
  redirect('/admin?t=admins&saved=1');
}

export async function deleteAdminAction(form: FormData): Promise<void> {
  const user = await adminUser();
  if (!user) redirect('/admin/login');
  const target = String(form.get('userId') ?? '');
  if (form.get('confirm') !== 'yes') redirect(`/admin?t=admins&edit=${encodeURIComponent(target)}`);
  await asUser(user, (c) => deleteAdmin(c, target)).catch((e) => {
    if (!(e instanceof ApiError)) throw e;
  });
  revalidatePath('/admin');
  redirect('/admin?t=admins&deleted=1');
}
