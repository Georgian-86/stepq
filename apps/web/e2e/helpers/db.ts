import pg from 'pg';

/**
 * Database access for e2e tests: the app under test (playwright.config.ts) and these helpers
 * share E2E_DATABASE_URL, a local Postgres set up by `pnpm e2e` (scripts/e2e.mjs).
 */
export const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/stepq_e2e';
export const BASE_URL = `http://127.0.0.1:${process.env.E2E_PORT ?? 3100}`;

let pool: pg.Pool | undefined;
async function q<R extends pg.QueryResultRow = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
) {
  pool ??= new pg.Pool({ connectionString: DATABASE_URL, max: 2 });
  return (await pool.query<R>(sql, params)).rows;
}

const TABLES = [
  'waitlist',
  'team_applications',
  'ambassador_applications',
  'backings',
  'founder_messages',
  'mail',
  'rate_limits',
  'requests',
  'chunks',
];

/** Empties every table (waitlist, mail, rate limits…) and zeroes the live count. */
export async function resetDb(): Promise<void> {
  const exists = await q(`select 1 from pg_namespace where nspname = 'stepq'`);
  if (!exists.length) return; // the app creates the schema on its first query
  await q(`truncate ${TABLES.map((t) => `stepq.${t}`).join(', ')}`);
  await q('update stepq.stats set waitlist_count = 0');
}

export interface MailDoc {
  id: string;
  to: string;
  template: string;
  subject: string;
  props: Record<string, unknown>;
  status: 'queued' | 'sending' | 'sent' | 'failed' | string;
  replyTo?: string;
}

/** Mail rows written by the API (MAIL_TRANSPORT=log marks them sent), optionally filtered. */
export async function readMail(
  filter: Partial<Pick<MailDoc, 'to' | 'template' | 'status'>> = {},
): Promise<MailDoc[]> {
  const rows = await q<{
    id: string;
    to_addr: string;
    template: string;
    subject: string;
    props: Record<string, unknown>;
    status: string;
    reply_to: string | null;
  }>('select * from stepq.mail order by id');
  return rows
    .map((r) => ({
      id: r.id,
      to: r.to_addr,
      template: r.template,
      subject: r.subject,
      props: r.props,
      status: r.status,
      ...(r.reply_to ? { replyTo: r.reply_to } : {}),
    }))
    .filter((m) =>
      Object.entries(filter).every(([k, v]) => v === undefined || m[k as keyof MailDoc] === v),
    );
}

const camel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());

/** Every row of a table, keys in camelCase (`show_on_wall` → `showOnWall`), nulls dropped. */
export async function readRows<T = Record<string, unknown>>(
  table:
    'waitlist' | 'team_applications' | 'ambassador_applications' | 'backings' | 'founder_messages',
): Promise<T[]> {
  const rows = await q(`select * from stepq.${table} order by created_at`);
  return rows.map(
    (r) =>
      Object.fromEntries(
        Object.entries(r)
          .filter(([, v]) => v !== null)
          .map(([k, v]) => [camel(k), v]),
      ) as T,
  );
}

/** Sets the live waitlist count shown on the home page. */
export async function setWaitlistCount(n: number): Promise<void> {
  await q('update stepq.stats set waitlist_count = $1', [n]);
}

/** Adds verified, opted-in backers so the home page wall lists these names in this order. */
export async function seedBackers(names: string[]): Promise<void> {
  for (const [i, name] of names.entries()) {
    await q(
      `insert into stepq.backings (id, name, phone, amount, show_on_wall, reference, status, wall_name, verified_at)
       values (gen_random_uuid(), $1, '9876543210', 101, true, $2, 'verified', $1, now() + make_interval(secs => $3))`,
      [name, `SEED${i}`, i],
    );
  }
}

/** The backers wall as the home page reads it. */
export async function readWall(): Promise<string[]> {
  const res = await fetch(`${BASE_URL}/api/public/backers`);
  return ((await res.json()) as { names: string[] }).names;
}

/** The signed `token` from a mail's action link (reserveUrl / approveUrl / verifyUrl). */
export function actionTokenFromMail(mail: MailDoc): string {
  for (const key of ['reserveUrl', 'approveUrl', 'verifyUrl']) {
    const url = mail.props[key];
    if (typeof url !== 'string') continue;
    const token = new URL(url).searchParams.get('token');
    if (token) return token;
  }
  throw new Error(`No action token in mail ${mail.id} (${mail.template})`);
}

/** Calls the site's API directly, as a page would. */
export async function callFunction<T = unknown>(name: string, data: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}/api/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`${name} failed: ${res.status} ${await res.text()}`);
  return ((await res.json()) as { result: T }).result;
}

/**
 * Opens the action link in a mail the way /confirm would: calls `confirmAction` with the
 * mail's token (e.g. the founder verifying a backing).
 */
export async function confirmFromMail(mail: MailDoc): Promise<void> {
  await callFunction('confirmAction', { token: actionTokenFromMail(mail) });
}
