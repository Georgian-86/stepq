import { firstName } from '@stepq/core';
import { CHANNEL, fill, pickLine, type NudgeKind, type PushValues } from '@/lib/pushCopy';
import { ensureAdminSchema } from '../admin/data';
import { query, type Client, connect } from '../db';
import { loggable } from '../errors';
import { pool, sendPush, serviceAccount, type PushData } from './fcm';

/**
 * Who gets what, and when. Runs on the server's own database connection (the `postgres` role),
 * which reads the app's tables (`app.push_tokens`, `app.profiles`, `app.daily_steps`) to address
 * and personalise each push. Nothing here is reachable from a browser: admins queue pushes
 * through `stepq.queue_push`, and the scheduler calls /api/cron/push with CRON_SECRET.
 *
 * Times are India time, like the rest of StepQ.
 */

const IST = 'Asia/Kolkata';
const CONCURRENCY = 20;
/** Automatic nudges per person per India day, at most. Admin pushes do not count. */
export const DAILY_NUDGE_CAP = 4;

type Recipient = {
  user_id: string;
  display_name: string | null;
  daily_goal: number;
  steps: number;
  distance_m: number;
  tokens: string[];
};

const APP_READY = `select to_regclass('app.push_tokens') is not null
  and to_regclass('app.profiles') is not null and to_regclass('app.daily_steps') is not null as ok`;

/** Whether the app's tables exist in this database (they are created from the app's repo). */
async function appReady(c?: Client): Promise<boolean> {
  const { rows } = c
    ? await c.query<{ ok: boolean }>(APP_READY)
    : await query<{ ok: boolean }>(APP_READY);
  return Boolean(rows[0]?.ok);
}

const valuesFor = (r: Recipient, streak?: number): PushValues => ({
  name: r.display_name ? firstName(r.display_name) : undefined,
  steps: r.steps,
  goal: r.daily_goal,
  left: Math.max(0, r.daily_goal - r.steps) || undefined,
  km: r.distance_m ? (r.distance_m / 1000).toFixed(1) : undefined,
  streak,
});

/** Sends one push to every device of `r`; deletes tokens FCM says are dead. */
async function sendTo(r: Recipient, data: PushData, sa: ReturnType<typeof serviceAccount>) {
  let delivered = 0;
  let failed = 0;
  const gone: string[] = [];
  for (const token of r.tokens) {
    const result = await sendPush(token, data, sa).catch((e) => {
      console.error('push send', loggable(e));
      return 'failed' as const;
    });
    if (result === 'ok') delivered++;
    else failed++;
    if (result === 'gone') gone.push(token);
  }
  if (gone.length) {
    await query('delete from app.push_tokens where token = any($1)', [gone]).catch(() => {});
  }
  return { delivered, failed };
}

const RECIPIENTS = `
  select p.id as user_id, p.display_name, p.daily_goal,
    coalesce(s.steps, 0)::int as steps, coalesce(s.distance_m, 0)::int as distance_m,
    array_agg(t.token) as tokens
  from app.push_tokens t
  join app.profiles p on p.id = t.user_id
  left join app.daily_steps s on s.user_id = p.id and s.day = (now() at time zone '${IST}')::date`;

async function audienceOf(audience: string, username: string | null): Promise<Recipient[]> {
  const { rows } = await query<Recipient>(
    `${RECIPIENTS}
     where case $1
       when 'everyone' then true
       when 'not_walked_today' then coalesce(s.steps, 0) < 1000
       when 'goal_reached_today' then coalesce(s.steps, 0) >= p.daily_goal
       when 'username' then lower(p.username) = lower($2)
       else false end
     group by p.id, p.display_name, p.daily_goal, s.steps, s.distance_m`,
    [audience, username],
  );
  return rows;
}

type Campaign = {
  id: string;
  title: string;
  body: string;
  audience: string;
  username: string | null;
  image_url: string | null;
  route: string;
};

/**
 * Sends admin pushes that are due. Each is claimed (queued → sending) first, so two runs never
 * send the same one. A push left in `sending` by a crashed run is marked failed, not resent.
 */
export async function deliverCampaigns(limit = 5): Promise<number> {
  const sa = serviceAccount();
  await ensureAdminSchema();
  await query(
    `update stepq.push_campaigns set status = 'failed', error = 'Interrupted while sending.',
       finished_at = now()
     where status = 'sending' and started_at < now() - interval '15 minutes'`,
  );
  if (!sa) return 0;
  const { rows: due } = await query<Campaign>(
    `update stepq.push_campaigns set status = 'sending', started_at = now()
     where id in (
       select id from stepq.push_campaigns where status = 'queued' and send_at <= now()
       order by send_at limit $1 for update skip locked
     )
     returning id, title, body, audience, username, image_url, route`,
    [limit],
  );
  for (const campaign of due) {
    try {
      if (!(await appReady())) {
        throw new Error('The app’s tables are not set up in Supabase yet.');
      }
      const people = await audienceOf(campaign.audience, campaign.username);
      const results = await pool(people, CONCURRENCY, (r) =>
        sendTo(
          r,
          {
            title: fill(campaign.title, valuesFor(r)),
            body: fill(campaign.body, valuesFor(r)),
            channel: CHANNEL.campaign,
            kind: 'campaign',
            image: campaign.image_url ?? undefined,
            route: campaign.route,
          },
          sa,
        ),
      );
      const delivered = results.reduce((n, x) => n + x.delivered, 0);
      const failed = results.reduce((n, x) => n + x.failed, 0);
      await query(
        `update stepq.push_campaigns
         set status = $2, recipients = $3, delivered = $4, failed = $5, finished_at = now(),
           error = $6
         where id = $1`,
        [
          campaign.id,
          delivered ? 'sent' : 'failed',
          people.length,
          delivered,
          failed,
          people.length
            ? delivered
              ? null
              : 'No device accepted it.'
            : campaign.audience === 'username'
              ? 'That username has no phone with StepQ notifications on.'
              : 'Nobody matched.',
        ],
      );
    } catch (e) {
      console.error('push campaign', loggable(e));
      await query(
        `update stepq.push_campaigns set status = 'failed', error = $2, finished_at = now() where id = $1`,
        [campaign.id, loggable(e).message.slice(0, 200)],
      );
    }
  }
  return due.length;
}

/** Minutes since India midnight, and the India date (YYYY-MM-DD). */
export function indiaClock(now: Date): { minutes: number; day: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return {
    minutes: get('hour') * 60 + get('minute'),
    day: new Intl.DateTimeFormat('en-CA', { timeZone: IST }).format(now),
  };
}

const at = (h: number, m = 0) => h * 60 + m;

/** Nudge slots: [kind, log key (once per day), from, to) in India minutes. */
export const SLOTS: [NudgeKind, string, number, number][] = [
  ['goal_reached', 'goal_reached', at(7), at(22, 30)],
  ['streak_risk', 'streak_risk', at(20, 30), at(22)],
  ['evening_close', 'evening', at(18, 30), at(20)],
  ['evening_behind', 'evening', at(18, 30), at(20)],
  ['water', 'water_pm', at(16, 30), at(17, 30)],
  ['water', 'water_am', at(11, 30), at(12, 30)],
  ['comeback', 'comeback', at(10), at(12)],
  ['morning', 'morning', at(8), at(10)],
];

export type History = { day: string; steps: number }[];

const addDays = (day: string, n: number) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);

/** Days in a row, ending yesterday, at or over the goal. */
export function streakBefore(day: string, goal: number, history: History): number {
  const met = new Set(history.filter((h) => h.steps >= goal).map((h) => h.day));
  let n = 0;
  while (met.has(addDays(day, -(n + 1)))) n++;
  return n;
}

/** Days since the last day with any steps (null: never). */
export function daysIdle(day: string, history: History): number | null {
  const walked = history
    .filter((h) => h.steps > 0 && h.day < day)
    .map((h) => h.day)
    .sort();
  const last = walked.at(-1);
  if (!last) return null;
  return Math.round(
    (Date.parse(`${day}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / 86_400_000,
  );
}

/**
 * The one nudge (if any) `r` should get at `minutes` on `day`, most important first. `sent` is
 * the log keys already used today.
 */
export function chooseNudge(
  r: Pick<Recipient, 'steps' | 'daily_goal'>,
  history: History,
  minutes: number,
  day: string,
  sent: Set<string>,
): { kind: NudgeKind; key: string; streak?: number } | null {
  // Over the daily cap, only the celebration still goes out: it is the one people like.
  const capped = sent.size >= DAILY_NUDGE_CAP;
  const streak = streakBefore(day, r.daily_goal, history);
  const idle = daysIdle(day, history);
  for (const [kind, key, from, to] of SLOTS) {
    if (minutes < from || minutes >= to || sent.has(key)) continue;
    if (capped && kind !== 'goal_reached') continue;
    const reached = r.steps >= r.daily_goal;
    const ok = {
      goal_reached: reached,
      streak_risk: !reached && streak >= 2,
      evening_close: !reached && r.steps >= r.daily_goal * 0.6,
      evening_behind: r.steps < r.daily_goal * 0.6,
      water: true,
      comeback: r.steps === 0 && (idle === 3 || idle === 7),
      morning: r.steps < 500 && idle !== null && idle < 3,
    }[kind];
    if (ok) return { kind, key, streak };
  }
  return null;
}

/**
 * Sends the automatic nudges due at `now` (morning kick-off, water, evening progress, streak
 * at risk, goal reached, come back). Safe to run every few minutes: each nudge is claimed in
 * stepq.push_sends before it is sent, so it goes out once per person per day.
 */
export async function runNudges(now = new Date()): Promise<number> {
  const sa = serviceAccount();
  if (!sa) return 0;
  const { minutes, day } = indiaClock(now);
  if (!SLOTS.some(([, , from, to]) => minutes >= from && minutes < to)) return 0;
  await ensureAdminSchema();
  const c = await connect();
  let people: Recipient[];
  let history: Map<string, History>;
  let sentToday: Map<string, Set<string>>;
  try {
    if (!(await appReady(c))) return 0;
    people = (
      await c.query<Recipient>(
        `${RECIPIENTS} group by p.id, p.display_name, p.daily_goal, s.steps, s.distance_m`,
      )
    ).rows;
    const ids = people.map((p) => p.user_id);
    const { rows: past } = await c.query<{ user_id: string; day: string; steps: number }>(
      `select user_id, to_char(day, 'YYYY-MM-DD') as day, steps from app.daily_steps
       where user_id = any($1) and day >= $2::date - 30 and day < $2::date`,
      [ids, day],
    );
    history = new Map();
    for (const h of past) {
      const list = history.get(h.user_id) ?? [];
      list.push({ day: h.day, steps: h.steps });
      history.set(h.user_id, list);
    }
    const { rows: sent } = await c.query<{ user_id: string; kind: string }>(
      'select user_id::text, kind from stepq.push_sends where day = $1 and user_id = any($2)',
      [day, ids],
    );
    sentToday = new Map();
    for (const s of sent) {
      const set = sentToday.get(s.user_id) ?? new Set();
      set.add(s.kind);
      sentToday.set(s.user_id, set);
    }
  } finally {
    c.release();
  }

  const picks = people
    .map((r) => ({
      r,
      nudge: chooseNudge(
        r,
        history.get(r.user_id) ?? [],
        minutes,
        day,
        sentToday.get(r.user_id) ?? new Set(),
      ),
    }))
    .filter((x): x is { r: Recipient; nudge: NonNullable<typeof x.nudge> } => x.nudge !== null);

  const sent = await pool(picks, CONCURRENCY, async ({ r, nudge }) => {
    const { rowCount } = await query(
      `insert into stepq.push_sends (user_id, kind, day) values ($1, $2, $3) on conflict do nothing`,
      [r.user_id, nudge.key, day],
    );
    if (!rowCount) return 0; // another run got there first
    const line = pickLine(nudge.kind, r.user_id, day);
    const values = valuesFor(r, nudge.streak);
    const { delivered } = await sendTo(
      r,
      {
        title: fill(line.title, values),
        body: fill(line.body, values),
        channel: CHANNEL[nudge.kind],
        kind: nudge.kind,
        route: 'home',
      },
      sa,
    );
    return delivered ? 1 : 0;
  });
  return sent.reduce<number>((a, b) => a + b, 0);
}
