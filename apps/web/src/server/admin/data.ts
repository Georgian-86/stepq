import { transaction, type Client } from '../db';
import { ApiError } from '../errors';
import type { AuthUser } from './gotrue';
import { ADMIN_SQL } from './schema';

let ready: Promise<void> | undefined;

function ensureAdminSchema(): Promise<void> {
  ready ??= transaction(async (c) => {
    await c.query('select pg_advisory_xact_lock(72788)');
    await c.query(ADMIN_SQL);
  }).catch((e) => {
    ready = undefined;
    throw e;
  });
  return ready;
}

/**
 * Runs `fn` as the signed-in user under Postgres RLS: role `authenticated`, with the user's id
 * as the JWT `sub` claim. Rows come back only where the `admins_read` policies allow them.
 */
export async function asUser<T>(user: AuthUser, fn: (c: Client) => Promise<T>): Promise<T> {
  await ensureAdminSchema();
  return transaction(async (c) => {
    await c.query(`select set_config('request.jwt.claims', $1, true)`, [
      JSON.stringify({ sub: user.id, email: user.email, role: 'authenticated' }),
    ]);
    await c.query('set local role authenticated');
    return fn(c);
  });
}

export async function isAdmin(user: AuthUser): Promise<boolean> {
  return asUser(user, async (c) => {
    const { rows } = await c.query<{ ok: boolean }>('select stepq.is_admin() as ok');
    return rows[0]!.ok;
  });
}

/** Display names for the site's tables; any other table shows under its own name. */
export const TABLE_LABELS: Record<string, string> = {
  waitlist: 'Waitlist',
  founder_messages: 'Reach-outs',
  team_applications: 'Job applications',
  ambassador_applications: 'Ambassador applications',
  backings: 'Backings',
  mail: 'Mail',
  admins: 'Admins',
  stats: 'Stats',
  rate_limits: 'Rate limits',
  requests: 'Requests',
  chunks: 'Upload chunks',
};
const ORDER = Object.keys(TABLE_LABELS);
const INTERNAL = new Set(['stats', 'rate_limits', 'requests', 'chunks']);

export type TableInfo = { name: string; label: string; count: number; internal: boolean };
type Column = { name: string; type: string };

/** Every table the user may read in `stepq`, with row counts (as RLS lets them see). */
export async function listTables(c: Client): Promise<TableInfo[]> {
  const { rows } = await c.query<{ name: string }>(
    `select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'stepq' and c.relkind in ('r', 'p') and has_table_privilege(c.oid, 'select')`,
  );
  const tables: TableInfo[] = [];
  for (const { name } of rows) {
    const { rows: n } = await c.query<{ n: string }>(
      `select count(*) as n from stepq.${ident(name)}`,
    );
    tables.push({
      name,
      label: TABLE_LABELS[name] ?? name,
      count: Number(n[0]!.n),
      internal: INTERNAL.has(name),
    });
  }
  const rank = (t: string) => (ORDER.includes(t) ? ORDER.indexOf(t) : ORDER.length);
  return tables.sort((a, b) => rank(a.name) - rank(b.name) || a.name.localeCompare(b.name));
}

const ident = (name: string) => `"${name.replace(/"/g, '""')}"`;

async function columnsOf(c: Client, table: string): Promise<Column[]> {
  const { rows } = await c.query<Column>(
    `select column_name as name, data_type as type from information_schema.columns
     where table_schema = 'stepq' and table_name = $1 order by ordinal_position`,
    [table],
  );
  if (!rows.length) throw new ApiError('not-found', 'No such table.');
  return rows;
}

export const PAGE_SIZE = 50;

export type Cell = string | null;
export type TablePage = {
  columns: Column[];
  rows: Cell[][];
  /** Row id per row (`id`, or `user_id` for admins), for résumé links and Remove buttons. */
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

function searchClause(columns: Column[]): string {
  const text = columns.filter((col) => !isBinary(col)).map((col) => `${ident(col.name)}::text`);
  return text.length ? `concat_ws(' ', ${text.join(', ')}) ilike $1` : 'false';
}

function orderBy(columns: Column[]): string {
  const names = columns.map((col) => col.name);
  if (names.includes('created_at')) return 'created_at desc nulls last';
  return `${ident(names[0]!)} desc`;
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

/** One page of a table, newest first, optionally filtered by text in any column. */
export async function readTable(
  c: Client,
  table: string,
  { page = 1, search = '' }: { page?: number; search?: string } = {},
): Promise<TablePage> {
  const columns = await columnsOf(c, table);
  const where = search ? `where ${searchClause(columns)}` : '';
  const params: unknown[] = search ? [likePattern(search)] : [];
  const { rows: n } = await c.query<{ n: string }>(
    `select count(*) as n from stepq.${ident(table)} ${where}`,
    params,
  );
  const offset = (Math.max(1, page) - 1) * PAGE_SIZE;
  const { rows } = await c.query<Record<string, unknown>>(
    `select ${selectList(columns)} from stepq.${ident(table)} ${where}
     order by ${orderBy(columns)} limit ${PAGE_SIZE} offset ${offset}`,
    params,
  );
  return {
    columns,
    rows: rows.map((r) => columns.map((col) => formatCell(r[col.name], col))),
    ids: rows.map((r) => {
      const id = r.id ?? r.user_id;
      return id === undefined || id === null ? null : String(id);
    }),
    total: Number(n[0]!.n),
  };
}

/** The whole table as CSV (files as sizes), newest first. */
export async function tableCsv(c: Client, table: string): Promise<string> {
  const columns = await columnsOf(c, table);
  const { rows } = await c.query<Record<string, unknown>>(
    `select ${selectList(columns)} from stepq.${ident(table)} order by ${orderBy(columns)}`,
  );
  const esc = (v: Cell) => {
    if (v === null) return '';
    // A leading = + - @ would run as a formula in Excel / Sheets.
    const s = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [columns.map((col) => esc(col.name)).join(',')];
  for (const r of rows)
    lines.push(columns.map((col) => esc(formatCell(r[col.name], col))).join(','));
  return lines.join('\r\n') + '\r\n';
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
