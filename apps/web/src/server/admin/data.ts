import { createHash } from 'node:crypto';
import { wallName } from '@stepq/core';
import { TABLES, tableLabel } from '@/lib/adminTables';
import { connect, transaction, type Client } from '../db';
import { ApiError } from '../errors';
import type { AuthUser } from './gotrue';
import { ADMIN_SQL } from './schema';

let ready: Promise<void> | undefined;
const ADMIN_MARK = `admin:${createHash('sha256').update(ADMIN_SQL).digest('hex').slice(0, 16)}`;

/**
 * Applies ADMIN_SQL when this code's version of it has not run yet (marked by a comment on
 * `stepq.is_admin`) or a table without the admins_read policy has appeared. Otherwise a cold
 * start costs one catalog read instead of DDL and table locks.
 */
function ensureAdminSchema(): Promise<void> {
  ready ??= transaction(async (c) => {
    const current = async () => {
      const { rows } = await c.query<{ ok: boolean }>(
        `select coalesce(obj_description(to_regprocedure('stepq.is_admin()')::oid, 'pg_proc') = $1, false)
           and not exists (
             select 1 from pg_tables t where t.schemaname = 'stepq' and not exists (
               select 1 from pg_policies p
               where p.schemaname = 'stepq' and p.tablename = t.tablename
                 and p.policyname = 'admins_read'
             )
           ) as ok`,
        [ADMIN_MARK],
      );
      return rows[0]!.ok;
    };
    if (await current()) return;
    await c.query('select pg_advisory_xact_lock(72788)');
    await c.query(ADMIN_SQL);
    await c.query(`comment on function stepq.is_admin() is '${ADMIN_MARK}'`);
  }).catch((e) => {
    ready = undefined;
    throw e;
  });
  return ready;
}

/**
 * Runs `fn` as the signed-in user under Postgres RLS: role `authenticated`, with the user's id
 * as the JWT `sub` claim. Rows come back only where the `admins_read` policies allow them.
 * Opening the transaction, setting the claims and role, and asking `stepq.is_admin()` share one
 * round trip; with `adminOnly`, `fn` runs only when the user is an admin (otherwise: null).
 */
async function runAs<T>(
  user: AuthUser,
  adminOnly: boolean,
  fn: (c: Client) => Promise<T>,
): Promise<T | null> {
  await ensureAdminSchema();
  const claims = JSON.stringify({ sub: user.id, email: user.email, role: 'authenticated' });
  const c = await connect();
  try {
    const results = (await c.query(
      `begin;
       select set_config('request.jwt.claims', ${lit(claims)}, true),
              set_config('role', 'authenticated', true);
       select stepq.is_admin() as ok`,
    )) as unknown as { rows: { ok?: boolean }[] }[];
    const result = !adminOnly || results[2]!.rows[0]!.ok ? await fn(c) : null;
    await c.query('commit');
    return result;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

export async function asUser<T>(user: AuthUser, fn: (c: Client) => Promise<T>): Promise<T> {
  return (await runAs(user, false, fn)) as T;
}

/** Like `asUser`, for reads only admins may make: null when the user is not an admin. */
export function asAdmin<T>(user: AuthUser, fn: (c: Client) => Promise<T>): Promise<T | null> {
  return runAs(user, true, fn);
}

export async function isAdmin(user: AuthUser): Promise<boolean> {
  return (await asAdmin(user, async () => true)) ?? false;
}

const ORDER = Object.keys(TABLES);

export type TableInfo = { name: string; label: string; count: number; internal: boolean };
export type Column = { name: string; type: string };

/** Every table the user may read in `stepq`, with row counts (as RLS lets them see), in one query. */
export async function listTables(c: Client): Promise<TableInfo[]> {
  const { rows } = await c.query<{ name: string }>(
    `select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'stepq' and c.relkind in ('r', 'p') and has_table_privilege(c.oid, 'select')`,
  );
  if (!rows.length) return [];
  const { rows: counts } = await c.query<{ name: string; n: string }>(
    rows
      .map(
        (_, i) =>
          `select $${i + 1}::text as name, count(*) as n from stepq.${ident(rows[i]!.name)}`,
      )
      .join(' union all '),
    rows.map((r) => r.name),
  );
  const tables = counts.map(({ name, n }) => ({
    name,
    label: tableLabel(name),
    count: Number(n),
    internal: Boolean(TABLES[name]?.internal),
  }));
  const rank = (t: TableInfo) =>
    (t.internal ? ORDER.length : 0) +
    (ORDER.includes(t.name) ? ORDER.indexOf(t.name) : ORDER.length);
  return tables.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
}

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

const columnMemo = new WeakMap<Client, Map<string, Column[]>>();

/**
 * A table's columns, from pg_catalog (information_schema is slow to query). Asked once per
 * transaction: the table, its facets and a row's details share the answer.
 */
export async function columnsOf(c: Client, table: string): Promise<Column[]> {
  let memo = columnMemo.get(c);
  if (!memo) columnMemo.set(c, (memo = new Map()));
  const hit = memo.get(table);
  if (hit) return hit;
  const { rows } = await c.query<Column>(
    `select a.attname as name, format_type(a.atttypid, null) as type
     from pg_attribute a
     join pg_class t on t.oid = a.attrelid
     join pg_namespace n on n.oid = t.relnamespace
     where n.nspname = 'stepq' and t.relname = $1 and a.attnum > 0 and not a.attisdropped
       and has_table_privilege(t.oid, 'select')
     order by a.attnum`,
    [table],
  );
  if (!rows.length) throw new ApiError('not-found', 'No such table.');
  memo.set(table, rows);
  return rows;
}

export const PAGE_SIZE = 50;

export type Cell = string | null;
export type TablePage = {
  columns: Column[];
  rows: Cell[][];
  /** Row id per row (`id`, or `user_id` for admins), for résumé links, statuses and details. */
  ids: (string | null)[];
  total: number;
};

/** File columns are never loaded into the dashboard: they show as a size. */
const isBinary = (col: Column) => col.type === 'bytea';

function selectList(columns: Column[]): string {
  return columns
    .map((col) =>
      isBinary(col) ? `octet_length(${ident(col.name)}) as ${ident(col.name)}` : ident(col.name),
    )
    .join(', ');
}

export function formatCell(value: unknown, col: Column): Cell {
  if (value === null || value === undefined) return null;
  if (isBinary(col)) return `${formatBytes(Number(value))} file`;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

const likePattern = (q: string) => `%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** What narrows a table's rows; shared by the page, its counts and downloads. */
export type RowQuery = {
  search?: string;
  /** Column → exact value (as text). Unknown and binary columns are ignored. */
  filters?: Record<string, string>;
  /** Inclusive days (YYYY-MM-DD, India time) on `created_at`. */
  from?: string;
  to?: string;
  sort?: string;
  dir?: 'asc' | 'desc';
};

/** The WHERE clause and its parameters for `q`; every column name is checked against `columns`. */
function whereOf(columns: Column[], q: RowQuery, params: unknown[] = []) {
  const parts: string[] = [];
  const names = new Set(columns.filter((col) => !isBinary(col)).map((col) => col.name));
  const search = q.search?.trim();
  if (search) {
    const text = columns.filter((col) => !isBinary(col)).map((col) => `${ident(col.name)}::text`);
    params.push(likePattern(search));
    parts.push(
      text.length ? `concat_ws(' ', ${text.join(', ')}) ilike $${params.length}` : 'false',
    );
  }
  for (const [name, value] of Object.entries(q.filters ?? {})) {
    if (!names.has(name)) continue;
    if (value === '') {
      parts.push(`${ident(name)} is null`);
    } else {
      params.push(value);
      parts.push(`${ident(name)}::text = $${params.length}`);
    }
  }
  if (names.has('created_at')) {
    if (q.from && DAY.test(q.from)) {
      params.push(q.from);
      parts.push(`created_at >= ($${params.length}::date)::timestamp at time zone 'Asia/Kolkata'`);
    }
    if (q.to && DAY.test(q.to)) {
      params.push(q.to);
      parts.push(
        `created_at < ($${params.length}::date + 1)::timestamp at time zone 'Asia/Kolkata'`,
      );
    }
  }
  return { where: parts.length ? `where ${parts.join(' and ')}` : '', params };
}

function orderBy(columns: Column[], q: RowQuery = {}): string {
  const names = columns.map((col) => col.name);
  const dir = q.dir === 'asc' ? 'asc' : 'desc';
  if (q.sort && names.includes(q.sort)) return `${ident(q.sort)} ${dir} nulls last`;
  if (names.includes('created_at')) return 'created_at desc nulls last';
  return `${ident(names[0]!)} desc`;
}

const rowId = (r: Record<string, unknown>) => {
  const id = r.id ?? r.user_id;
  return id === undefined || id === null ? null : String(id);
};

/** One page of a table, newest first unless sorted, narrowed by `q`. */
export async function readTable(
  c: Client,
  table: string,
  { page = 1, ...q }: RowQuery & { page?: number } = {},
): Promise<TablePage> {
  const columns = await columnsOf(c, table);
  const { where, params } = whereOf(columns, q);
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;
  const { rows: n } = await c.query<{ n: string }>(
    `select count(*) as n from stepq.${ident(table)} ${where}`,
    params,
  );
  const { rows } = await c.query<Record<string, unknown>>(
    `select ${selectList(columns)} from stepq.${ident(table)} ${where}
     order by ${orderBy(columns, q)} limit ${PAGE_SIZE} offset ${offset}`,
    params,
  );
  return {
    columns,
    rows: rows.map((r) => columns.map((col) => formatCell(r[col.name], col))),
    ids: rows.map(rowId),
    total: Number(n[0]!.n),
  };
}

/** Every row of a table that RLS lets the user see. */
export async function countRows(c: Client, table: string): Promise<number> {
  const { rows } = await c.query<{ n: string }>(`select count(*) as n from stepq.${ident(table)}`);
  return Number(rows[0]!.n);
}

/** One row by its id (`id` or `user_id`), every column, for the details panel. */
export async function readRow(
  c: Client,
  table: string,
  id: string,
): Promise<{ columns: Column[]; values: Cell[] } | null> {
  const columns = await columnsOf(c, table);
  const key =
    columns.find((col) => col.name === 'id') ?? columns.find((col) => col.name === 'user_id');
  if (!key) return null;
  const { rows } = await c.query<Record<string, unknown>>(
    `select ${selectList(columns)} from stepq.${ident(table)} where ${ident(key.name)}::text = $1`,
    [id],
  );
  const r = rows[0];
  return r ? { columns, values: columns.map((col) => formatCell(r[col.name], col)) } : null;
}

export type FacetValue = { value: string | null; count: number };

/**
 * The distinct values (most common first, at most 30) of each of `names`, counted over the rows
 * `q` selects without that column's own filter, for the filter menus and status tabs.
 */
export async function readFacets(
  c: Client,
  table: string,
  names: string[],
  q: RowQuery = {},
): Promise<Record<string, FacetValue[]>> {
  const columns = await columnsOf(c, table);
  const wanted = names.filter((name) => {
    const col = columns.find((x) => x.name === name);
    return col && !isBinary(col);
  });
  if (!wanted.length) return {};
  const params: unknown[] = [];
  const parts = wanted.map((name) => {
    const others = Object.fromEntries(Object.entries(q.filters ?? {}).filter(([k]) => k !== name));
    const { where } = whereOf(columns, { ...q, filters: others }, params);
    return `(select ${lit(name)} as name, ${ident(name)}::text as value, count(*) as n
       from stepq.${ident(table)} ${where} group by 2 order by 3 desc, 2 limit 30)`;
  });
  const { rows } = await c.query<{ name: string; value: string | null; n: string }>(
    parts.join(' union all '),
    params,
  );
  const out: Record<string, FacetValue[]> = Object.fromEntries(wanted.map((n) => [n, []]));
  for (const r of rows) out[r.name]!.push({ value: r.value, count: Number(r.n) });
  for (const values of Object.values(out)) {
    values.sort(
      (a, b) =>
        b.count - a.count ||
        (a.value === null ? 1 : b.value === null ? -1 : a.value < b.value ? -1 : 1),
    );
  }
  return out;
}

export type ExportFormat = 'csv' | 'json';

/** Rows for a download: the chosen columns (all when empty), narrowed by `q`, files as sizes. */
export async function tableExport(
  c: Client,
  table: string,
  {
    columns: chosen = [],
    format = 'csv',
    ...q
  }: RowQuery & { columns?: string[]; format?: ExportFormat } = {},
): Promise<string> {
  const all = await columnsOf(c, table);
  const columns = chosen.length ? all.filter((col) => chosen.includes(col.name)) : all;
  if (!columns.length) throw new ApiError('invalid-argument', 'Pick at least one column.');
  const { where, params } = whereOf(all, q);
  const { rows } = await c.query<Record<string, unknown>>(
    `select ${selectList(columns)} from stepq.${ident(table)} ${where} order by ${orderBy(all, q)}`,
    params,
  );
  const cells = rows.map((r) => columns.map((col) => formatCell(r[col.name], col)));
  if (format === 'json') {
    return JSON.stringify(
      cells.map((row) => Object.fromEntries(columns.map((col, i) => [col.name, row[i]]))),
      null,
      2,
    );
  }
  const esc = (v: Cell) => {
    if (v === null) return '';
    // A leading = + - @ would run as a formula in Excel / Sheets.
    const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((col) => esc(col.name)).join(',')];
  for (const row of cells) lines.push(row.map(esc).join(','));
  return lines.join('\r\n') + '\r\n';
}

/**
 * Sets a status an admin may change (see `stepq.set_status` and `TABLES[...].status`). Returns
 * true the first time an ambassador is approved.
 */
export async function setStatus(
  c: Client,
  table: string,
  id: string,
  value: string,
): Promise<boolean> {
  const def = TABLES[table]?.status;
  if (!def) throw new ApiError('invalid-argument', 'That status cannot be changed here.');
  let wall: string | null = null;
  if (table === 'backings' && value === 'verified') {
    const { rows } = await c.query<{ name: string }>(
      'select name from stepq.backings where id::text = $1',
      [id],
    );
    if (rows[0]) wall = wallName(rows[0].name);
  }
  try {
    const { rows } = await c.query<{ first: boolean }>(
      'select stepq.set_status($1, $2, $3, $4, $5) as first',
      [table, id, def.column, value, wall],
    );
    return rows[0]!.first;
  } catch (e) {
    adminError(e);
  }
}

/** A job application's résumé, if RLS lets the user read it. */
export async function readResume(c: Client, id: string) {
  const { rows } = await c.query<{ resume: Buffer; resume_name: string }>(
    'select resume, resume_name from stepq.team_applications where id = $1',
    [id],
  );
  return rows[0] ?? null;
}

/** Errors the admin functions raise on purpose; their messages are written for the admin. */
function adminError(e: unknown): never {
  const code = (e as { code?: string }).code;
  if (code === '42501') throw new ApiError('permission-denied', (e as Error).message);
  if (code === '22023') throw new ApiError('invalid-argument', (e as Error).message);
  throw e;
}

/**
 * Makes `email` an admin (see `stepq.add_admin`): a new address gets a Supabase Auth account
 * with `password`; an existing account keeps its own.
 */
export async function addAdmin(
  c: Client,
  email: string,
  password: string,
): Promise<'created' | 'promoted'> {
  try {
    const { rows } = await c.query<{ outcome: 'created' | 'promoted' }>(
      'select stepq.add_admin($1, $2) as outcome',
      [email, password],
    );
    return rows[0]!.outcome;
  } catch (e) {
    adminError(e);
  }
}

/** Takes admin access away from another admin (see `stepq.remove_admin`). */
export async function removeAdmin(c: Client, userId: string): Promise<void> {
  try {
    await c.query('select stepq.remove_admin($1)', [userId]);
  } catch (e) {
    adminError(e);
  }
}

/** Edits an admin (see `stepq.update_admin`); empty fields stay as they are. */
export async function updateAdmin(
  c: Client,
  userId: string,
  fields: { name?: string; email?: string; password?: string },
): Promise<void> {
  try {
    await c.query('select stepq.update_admin($1, $2, $3, $4)', [
      userId,
      fields.name ?? null,
      fields.email ?? '',
      fields.password ?? '',
    ]);
  } catch (e) {
    adminError(e);
  }
}

/** Deletes another admin's access and sign-in account (see `stepq.delete_admin`). */
export async function deleteAdmin(c: Client, userId: string): Promise<void> {
  try {
    await c.query('select stepq.delete_admin($1)', [userId]);
  } catch (e) {
    adminError(e);
  }
}

export type AdminProfile = { userId: string; email: string; name: string | null };

/** One admin's editable fields, if RLS lets the user read them. */
export async function readAdmin(c: Client, userId: string): Promise<AdminProfile | null> {
  const { rows } = await c.query<AdminProfile>(
    'select user_id as "userId", email, name from stepq.admins where user_id = $1',
    [userId],
  );
  return rows[0] ?? null;
}

export type Ranked = { label: string; count: number };
export type Overview = {
  /** Days shown, oldest first (YYYY-MM-DD, India time). */
  days: string[];
  /** New rows per day for each table with a `created_at`, aligned with `days`. */
  daily: Record<string, number[]>;
  /** Rows per status, for tables with a status an admin sets. */
  statuses: Record<string, FacetValue[]>;
};
export type SiteStats = {
  views: number[];
  clicks: number[];
  pages: Ranked[];
  clicked: Ranked[];
  referrers: Ranked[];
};

const INDIA_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' });
const spanOf = (range: number) => Math.min(365, Math.max(7, Math.floor(range)));

/** The last `range` days, oldest first (YYYY-MM-DD, India time). */
export function daysOf(range: number, now = new Date()): string[] {
  const today = new Date(`${INDIA_DAY.format(now)}T00:00:00Z`).getTime();
  const span = spanOf(range);
  return Array.from({ length: span }, (_, i) =>
    new Date(today - (span - 1 - i) * 86_400_000).toISOString().slice(0, 10),
  );
}

const since = `now() - make_interval(days => $1::int + 1)`;
const dayOf = `to_char((created_at at time zone 'Asia/Kolkata')::date, 'YYYY-MM-DD')`;

/** Everything the Stats page draws about records, for the last `range` days (India time). */
export async function readOverview(
  c: Client,
  tables: TableInfo[],
  range: number,
): Promise<Overview> {
  const span = spanOf(range);
  const days = daysOf(range);
  const index = new Map(days.map((d, i) => [d, i]));
  const visible = new Set(tables.map((t) => t.name));
  const { rows: withDates } = await c.query<{ name: string }>(
    `select t.relname as name from pg_class t join pg_namespace n on n.oid = t.relnamespace
     join pg_attribute a on a.attrelid = t.oid and a.attname = 'created_at' and not a.attisdropped
     where n.nspname = 'stepq' and t.relkind in ('r', 'p')`,
  );
  const dated = withDates
    .map((r) => r.name)
    .filter((name) => visible.has(name) && !TABLES[name]?.internal);

  const daily: Record<string, number[]> = {};
  if (dated.length) {
    const { rows } = await c.query<{ name: string; day: string; n: string }>(
      dated
        .map(
          (name) =>
            `select ${lit(name)} as name, ${dayOf} as day, count(*) as n
             from stepq.${ident(name)} where created_at >= ${since} group by 2`,
        )
        .join(' union all '),
      [span],
    );
    for (const name of dated) daily[name] = days.map(() => 0);
    for (const r of rows) {
      const i = index.get(r.day);
      if (i !== undefined) daily[r.name]![i] = Number(r.n);
    }
  }

  const statusTables = Object.entries(TABLES).filter(
    ([name, def]) => def.status && visible.has(name),
  );
  const statuses: Record<string, FacetValue[]> = {};
  if (statusTables.length) {
    const { rows } = await c.query<{ name: string; value: string | null; n: string }>(
      statusTables
        .map(
          ([name, def]) =>
            `select ${lit(name)} as name, ${ident(def.status!.column)}::text as value,
               count(*) as n from stepq.${ident(name)} group by 2`,
        )
        .join(' union all '),
    );
    for (const [name] of statusTables) statuses[name] = [];
    for (const r of rows) statuses[r.name]!.push({ value: r.value, count: Number(r.n) });
    for (const values of Object.values(statuses)) values.sort((a, b) => b.count - a.count);
  }
  return { days, daily, statuses };
}

/**
 * Website visits and clicks for the Stats page (null when site_events cannot be read). The
 * largest table, so it is read in two queries of its own, which the page runs alongside the
 * rest and streams in.
 */
export async function readSite(c: Client, range: number): Promise<SiteStats | null> {
  const { rows: ok } = await c.query<{ ok: boolean }>(
    `select coalesce(has_table_privilege(to_regclass('stepq.site_events'), 'select'), false) as ok`,
  );
  if (!ok[0]!.ok) return null;
  const span = spanOf(range);
  const days = daysOf(range);
  const index = new Map(days.map((d, i) => [d, i]));
  const views = days.map(() => 0);
  const clicks = days.map(() => 0);
  const { rows } = await c.query<{ day: string; views: string; clicks: string }>(
    `select ${dayOf} as day, count(*) filter (where kind = 'view') as views,
       count(*) filter (where kind = 'click') as clicks
     from stepq.site_events where created_at >= ${since} group by 1`,
    [span],
  );
  for (const r of rows) {
    const i = index.get(r.day);
    if (i === undefined) continue;
    views[i] = Number(r.views);
    clicks[i] = Number(r.clicks);
  }
  const top = (list: string, col: string, kind: string) =>
    `(select ${lit(list)} as list, ${ident(col)} as label, count(*) as n from e
      where kind = ${lit(kind)} and ${ident(col)} is not null group by 2 order by 3 desc, 2 limit 8)`;
  const { rows: ranked } = await c.query<{ list: string; label: string; n: string }>(
    `with e as materialized (
       select kind, path, label, referrer from stepq.site_events where created_at >= ${since}
     )
     ${top('pages', 'path', 'view')} union all ${top('clicked', 'label', 'click')}
     union all ${top('referrers', 'referrer', 'view')}`,
    [span],
  );
  const list = (name: string) =>
    ranked
      .filter((r) => r.list === name)
      .map((r) => ({ label: r.label, count: Number(r.n) }))
      .sort((a, b) => b.count - a.count || (a.label < b.label ? -1 : 1));
  return {
    views,
    clicks,
    pages: list('pages'),
    clicked: list('clicked'),
    referrers: list('referrers'),
  };
}

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;
