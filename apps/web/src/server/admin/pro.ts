import type { Client } from '../db';
import { ApiError } from '../errors';

/**
 * StepQ Pro in the admin panel: the Free/Pro limits, members' plans and QRun hosting, official
 * QRuns and Pro-only challenges. Everything runs as the signed-in admin (`asUser`), so Postgres
 * checks access: reads go through the `admins_read` policies on the app tables, writes through
 * the `app.admin_*` functions, which refuse anyone who is not in `stepq.admins` and log each
 * change to `app.admin_log`. Nothing here uses the service role.
 */

export type PlanFeature = {
  key: string;
  label: string;
  kind: 'switch' | 'limit';
  unit: string | null;
  free: number | null;
  pro: number | null;
  updatedAt: string | null;
};

export type Member = {
  id: string;
  name: string;
  username: string;
  plan: 'free' | 'pro';
  qrunHost: boolean;
  hostRequestedAt: string | null;
  proSince: string | null;
};

export type ProChallenge = { id: string; title: string; endsAt: string; proOnly: boolean };
export type LogEntry = { at: string; admin: string | null; action: string; detail: string };

export type ProData =
  | { ready: false }
  | {
      ready: true;
      features: PlanFeature[];
      members: Member[];
      requests: Member[];
      counts: { pro: number; free: number; hosts: number };
      challenges: ProChallenge[];
      log: LogEntry[];
      /** New Community posts waiting for review; null before the round 2 migration. */
      pending: PendingPost[] | null;
    };

export type PendingPost = {
  id: string;
  body: string;
  kind: string;
  steps: number | null;
  createdAt: string;
  name: string;
  username: string;
  plan: string;
};

export const MEMBER_FILTERS = ['all', 'pro', 'free', 'hosts', 'requests'] as const;
export type MemberFilter = (typeof MEMBER_FILTERS)[number];

/** Whether the Pro migration (20261126000000_pro_tier.sql in stepq-app) has been run. */
async function proReady(c: Client): Promise<boolean> {
  const { rows } = await c.query<{ ok: boolean }>(
    `select to_regclass('app.plan_features') is not null
        and to_regprocedure('app.admin_set_feature(text, integer, integer)') is not null as ok`,
  );
  return rows[0]?.ok ?? false;
}

const MEMBER_COLUMNS = `id, display_name as name, username, plan, qrun_host as "qrunHost",
  qrun_host_requested_at as "hostRequestedAt", pro_since as "proSince"`;

export async function readPro(
  c: Client,
  opts: { search?: string; filter?: MemberFilter } = {},
): Promise<ProData> {
  if (!(await proReady(c))) return { ready: false };
  const features = await c.query<PlanFeature>(
    `select key, label, kind, unit, free_value as free, pro_value as pro, updated_at as "updatedAt"
       from app.plan_features order by sort, key`,
  );
  const search = (opts.search ?? '').trim().slice(0, 60);
  const filter = opts.filter ?? 'all';
  const where = [
    search ? `(display_name ilike $1 or username ilike $1)` : 'true',
    filter === 'pro' ? `plan = 'pro'` : filter === 'free' ? `plan = 'free'` : 'true',
    filter === 'hosts' ? 'qrun_host' : 'true',
    filter === 'requests' ? 'qrun_host_requested_at is not null and not qrun_host' : 'true',
  ].join(' and ');
  const members = await c.query<Member>(
    `select ${MEMBER_COLUMNS} from app.profiles where ${where}
      order by (plan = 'pro') desc, display_name limit 50`,
    search ? [`%${search.replace(/[\\%_]/g, (m) => `\\${m}`)}%`] : [],
  );
  const requests = await c.query<Member>(
    `select ${MEMBER_COLUMNS} from app.profiles
      where qrun_host_requested_at is not null and not qrun_host
      order by qrun_host_requested_at limit 20`,
  );
  const counts = await c.query<{ pro: string; free: string; hosts: string }>(
    `select count(*) filter (where plan = 'pro') as pro, count(*) filter (where plan <> 'pro') as free,
            count(*) filter (where qrun_host) as hosts from app.profiles`,
  );
  const challenges = await c.query<ProChallenge>(
    `select id, title, ends_at as "endsAt", pro_only as "proOnly" from app.challenges
      where ends_at > now() order by ends_at limit 30`,
  );
  const approval = await c.query<{ ok: boolean }>(
    `select to_regprocedure('app.admin_review_post(uuid, boolean)') is not null as ok`,
  );
  const pending = approval.rows[0]?.ok
    ? (
        await c.query<PendingPost>(
          `select p.id, p.body, p.kind, p.steps, p.created_at as "createdAt",
                  a.display_name as name, a.username, a.plan
             from app.posts p join app.profiles a on a.id = p.author
            where p.status = 'pending' order by p.created_at limit 50`,
        )
      ).rows
    : null;
  const log = await c
    .query<LogEntry>(
      `select l.at, a.email as admin, l.action, concat_ws(' · ', l.target, nullif(l.detail::text, '{}')) as detail
       from app.admin_log l left join stepq.admins a on a.user_id = l.admin_id
      order by l.at desc limit 15`,
    )
    .catch(() => ({ rows: [] as LogEntry[] }));
  const n = counts.rows[0];
  return {
    ready: true,
    features: features.rows,
    members: members.rows,
    requests: requests.rows,
    counts: { pro: Number(n?.pro ?? 0), free: Number(n?.free ?? 0), hosts: Number(n?.hosts ?? 0) },
    challenges: challenges.rows,
    log: log.rows,
    pending,
  };
}

/**
 * A limit typed in the form: blank (or "unlimited") is null, otherwise a whole number 0–100000.
 * Switches are "on"/"off" checkboxes and arrive as 1 or 0.
 */
export function parseLimit(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '')
    .trim()
    .toLowerCase();
  if (s === '' || s === 'unlimited' || s === '∞') return null;
  if (!/^\d{1,6}$/.test(s))
    throw new ApiError('invalid-argument', 'Limits are whole numbers, or blank for unlimited.');
  const n = Number(s);
  if (n > 100_000) throw new ApiError('invalid-argument', 'That limit is too big.');
  return n;
}

/** Postgres errors from the app.admin_* functions, as messages an admin can act on. */
export function proError(e: unknown): never {
  const err = e as { code?: string; message?: string };
  if (err.code === '42501') throw new ApiError('permission-denied', 'Only admins can do that.');
  if (err.code === '22023' || err.code === 'P0001')
    throw new ApiError('invalid-argument', err.message ?? 'That was not accepted.');
  throw e;
}

export async function setFeature(c: Client, key: string, free: number | null, pro: number | null) {
  await c.query('select app.admin_set_feature($1, $2, $3)', [key, free, pro]).catch(proError);
}

export async function setMember(
  c: Client,
  id: string,
  plan: 'free' | 'pro',
  qrunHost: boolean | null,
) {
  await c
    .query('select app.admin_set_member($1::uuid, $2, $3)', [id, plan, qrunHost])
    .catch(proError);
}

export async function postOfficialQRun(
  c: Client,
  q: {
    title: string;
    place: string;
    startsAt: string;
    lat: number | null;
    lng: number | null;
    price: number;
  },
): Promise<string> {
  const { rows } = await c
    .query<{ id: string }>(
      'select app.admin_post_qrun($1, $2, $3::timestamptz, $4, $5, $6) as id',
      [q.title, q.place, q.startsAt, q.lat, q.lng, q.price],
    )
    .catch(proError);
  return rows[0]!.id;
}

export async function setChallengeProOnly(c: Client, id: string, proOnly: boolean) {
  await c
    .query('select app.admin_set_challenge_pro_only($1::uuid, $2)', [id, proOnly])
    .catch(proError);
}

export async function reviewPost(c: Client, id: string, approve: boolean) {
  await c.query('select app.admin_review_post($1::uuid, $2)', [id, approve]).catch(proError);
}
