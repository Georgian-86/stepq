'use server';

import { firstName } from '@stepq/core';
import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import {
  addAdmin,
  asUser,
  deleteAdmin,
  isAdmin,
  setStatus,
  updateAdmin,
} from '@/server/admin/data';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  authConfigured,
  cookieOptions,
  signInWithPassword,
  signOut,
} from '@/server/admin/gotrue';
import { adminUser, forgetToken } from '@/server/admin/session';
import { ApiError, loggable } from '@/server/errors';
import { transaction } from '@/server/db';
import { env } from '@/server/env';
import { clientIp } from '@/server/http';
import { deliverPendingMail, queueMail } from '@/server/mail';
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
  if (token) {
    forgetToken(token);
    await signOut(token);
  }
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

export type StatusResult = { error?: string };

/**
 * Sets a row's status (see `stepq.set_status`, which checks the caller is an admin). The first
 * time an ambassador is approved they get the same welcome email as the emailed approve link.
 */
export async function setStatusAction(
  table: string,
  id: string,
  value: string,
): Promise<StatusResult> {
  const user = await adminUser();
  if (!user) return { error: 'Your session has ended. Sign in again.' };
  try {
    const welcome = await asUser(user, async (c) => {
      const first = await setStatus(c, table, id, value);
      if (!first || table !== 'ambassador_applications') return null;
      const { rows } = await c.query<{ name: string; email: string; city: string }>(
        'select name, email, city from stepq.ambassador_applications where id::text = $1',
        [id],
      );
      return rows[0] ?? null;
    });
    if (welcome) {
      const kitUrl = env.ambassadorKitUrl();
      await transaction((c) =>
        queueMail(c, {
          to: welcome.email,
          subject: '',
          template: 'ambassadorApproved',
          props: {
            firstName: firstName(welcome.name),
            city: welcome.city,
            ...(kitUrl ? { kitUrl } : {}),
          },
        }),
      );
      after(() => deliverPendingMail().catch((e) => console.error('mail delivery', loggable(e))));
    }
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    console.error('set status', loggable(e));
    return { error: 'Could not save. Try again in a minute.' };
  }
  revalidatePath('/admin');
  return {};
}
