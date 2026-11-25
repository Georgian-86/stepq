'use server';

import { revalidatePath } from 'next/cache';
import { asUser } from '@/server/admin/data';
import {
  parseLimit,
  postOfficialQRun,
  setChallengeProOnly,
  setFeature,
  setMember,
} from '@/server/admin/pro';
import { adminUser } from '@/server/admin/session';
import { ApiError, loggable } from '@/server/errors';

export type ProState = { error?: string; done?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SIGNED_OUT = { error: 'Your session has ended. Sign in again.' };

/** Runs one admin change as the signed-in user; Postgres checks they are an admin. */
async function run(
  what: string,
  fn: Parameters<typeof asUser>[1],
  done: string,
): Promise<ProState> {
  const user = await adminUser();
  if (!user) return SIGNED_OUT;
  try {
    await asUser(user, fn);
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    console.error(what, loggable(e));
    return { error: 'Could not save. Try again in a minute.' };
  }
  revalidatePath('/admin/pro');
  return { done };
}

/** One feature's Free and Pro values. Switches come from checkboxes; limits from number boxes. */
export async function setFeatureAction(_prev: ProState, form: FormData): Promise<ProState> {
  const key = String(form.get('key') ?? '');
  const kind = String(form.get('kind') ?? '');
  let free: number | null;
  let pro: number | null;
  try {
    if (kind === 'switch') {
      free = form.get('free') === 'on' ? 1 : 0;
      pro = form.get('pro') === 'on' ? 1 : 0;
    } else {
      free = parseLimit(form.get('free'));
      pro = parseLimit(form.get('pro'));
    }
  } catch (e) {
    if (e instanceof ApiError) return { error: e.message };
    throw e;
  }
  return run(
    'set feature',
    (c) => setFeature(c, key, free, pro),
    'Saved. The app picks it up on next open.',
  );
}

/** Makes someone Pro or Free, and turns QRun hosting on or off. */
export async function setMemberAction(_prev: ProState, form: FormData): Promise<ProState> {
  const id = String(form.get('id') ?? '');
  const plan = form.get('plan') === 'pro' ? 'pro' : 'free';
  const host = form.get('host');
  const qrunHost = host === null ? null : host === 'on';
  if (!UUID.test(id)) return { error: 'Pick a member.' };
  return run(
    'set member',
    (c) => setMember(c, id, plan, plan === 'pro' ? qrunHost : false),
    plan === 'pro' ? (qrunHost ? 'Pro, and can host QRuns.' : 'Pro.') : 'Back on Free.',
  );
}

/** An official QRun, hosted by StepQ. The form's date and time are India time. */
export async function postQRunAction(_prev: ProState, form: FormData): Promise<ProState> {
  const title = String(form.get('title') ?? '').trim();
  const place = String(form.get('place') ?? '').trim();
  const when = String(form.get('starts_at') ?? '').trim();
  if (title.length < 3 || title.length > 80)
    return { error: 'Give it a name of 3 to 80 characters.' };
  if (place.length < 2 || place.length > 120) return { error: 'Add where people meet.' };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(when)) return { error: 'Pick a date and time.' };
  const startsAt = `${when}:00+05:30`;
  if (Date.parse(startsAt) <= Date.now()) return { error: 'Pick a time in the future.' };
  const num = (k: string) => {
    const v = String(form.get(k) ?? '').trim();
    return v === '' ? null : Number(v);
  };
  const lat = num('lat');
  const lng = num('lng');
  if ((lat !== null && !(Math.abs(lat) <= 90)) || (lng !== null && !(Math.abs(lng) <= 180)))
    return { error: 'Latitude and longitude look wrong.' };
  const price = num('price') ?? 0;
  if (!Number.isInteger(price) || price < 0 || price > 100_000)
    return { error: 'Price is whole rupees.' };
  return run(
    'post qrun',
    (c) => postOfficialQRun(c, { title, place, startsAt, lat, lng, price }),
    'Posted. It shows in the app as an official StepQ QRun.',
  );
}

export async function setChallengeProOnlyAction(
  _prev: ProState,
  form: FormData,
): Promise<ProState> {
  const id = String(form.get('id') ?? '');
  if (!UUID.test(id)) return { error: 'Pick a challenge.' };
  const proOnly = form.get('pro_only') === 'on';
  return run(
    'challenge pro only',
    (c) => setChallengeProOnly(c, id, proOnly),
    proOnly ? 'Pro members only.' : 'Open to everyone.',
  );
}
