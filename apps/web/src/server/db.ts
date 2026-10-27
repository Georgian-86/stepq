import { createHash } from 'node:crypto';
import pg from 'pg';
import { env } from './env';
import { SCHEMA_SQL } from './schema';

export type Client = pg.PoolClient;

let pool: pg.Pool | undefined;
let ready: Promise<void> | undefined;

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

/**
 * Splits DATABASE_URL into connection fields by hand rather than with `new URL()`, so a password
 * pasted raw (with `/`, `@`, `$`, `+`… unencoded) or a value with a stray line break still works,
 * and no parse error can ever echo the string (and its password) into the logs.
 */
export function parseDatabaseUrl(raw: string): pg.ClientConfig {
  const url = raw.replace(/\s+/g, '');
  const m =
    /^postgres(?:ql)?:\/\/([^:@/]+)(?::(.*))?@([^@/:]+)(?::(\d+))?\/([^?/]+)(?:\?.*)?$/.exec(url);
  if (!m) throw new Error('DATABASE_URL is not a postgresql://user:password@host:port/db string');
  const [, user, password = '', host, port = '5432', database] = m;
  const decode = (v: string) => {
    try {
      return decodeURIComponent(v);
    } catch {
      return v; // a raw password with a lone `%`
    }
  };
  return {
    user: decode(user!),
    password: /%[0-9a-f]{2}/i.test(password) ? decode(password) : password,
    host,
    port: Number(port),
    database: decode(database!),
    // Supabase's pooler serves TLS with its own CA.
    ssl: LOCAL_HOSTS.includes(host!) ? undefined : { rejectUnauthorized: false },
  };
}

function getPool(): pg.Pool {
  if (pool) return pool;
  const url = env.databaseUrl();
  if (!url) throw new Error('DATABASE_URL is not set');
  pool = new pg.Pool({
    ...parseDatabaseUrl(url),
    // Serverless: few connections per instance; the Supabase pooler multiplexes the rest.
    max: 3,
    idleTimeoutMillis: 10_000,
  });
  pool.on('error', () => {}); // an idle client dropped by the pooler is replaced on next use
  return pool;
}

/** Marks the schema as applied (a comment on `stepq`), so later cold starts skip the DDL. */
const SCHEMA_MARK = `schema:${createHash('sha256').update(SCHEMA_SQL).digest('hex').slice(0, 16)}`;

/**
 * Creates the tables on the first query of each server instance (idempotent, serialised). When
 * the database already has this exact schema, that is one catalog read instead of DDL, which
 * would otherwise take table locks on every cold start.
 */
function ensureSchema(): Promise<void> {
  ready ??= (async () => {
    const c = await getPool().connect();
    try {
      const { rows } = await c.query<{ current: boolean | null }>(
        `select obj_description(to_regnamespace('stepq')::oid, 'pg_namespace') = $1 as current`,
        [SCHEMA_MARK],
      );
      if (rows[0]?.current) return;
      await c.query('begin');
      await c.query('select pg_advisory_xact_lock(72787)');
      await c.query(SCHEMA_SQL);
      await c.query(`comment on schema stepq is '${SCHEMA_MARK}'`);
      await c.query('commit');
    } catch (e) {
      await c.query('rollback').catch(() => {});
      throw e;
    } finally {
      c.release();
    }
  })().catch((e) => {
    ready = undefined;
    throw e;
  });
  return ready;
}

export async function query<R extends pg.QueryResultRow = pg.QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<R>> {
  await ensureSchema();
  return getPool().query<R>(sql, params);
}

/** Runs `fn` in one transaction; any throw rolls it back. */
export async function transaction<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  await ensureSchema();
  const c = await getPool().connect();
  try {
    await c.query('begin');
    const result = await fn(c);
    await c.query('commit');
    return result;
  } catch (e) {
    await c.query('rollback').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Postgres unique_violation. */
export function isUniqueViolation(e: unknown): boolean {
  return typeof e === 'object' && e !== null && (e as { code?: string }).code === '23505';
}

/** Tests only: closes the pool so the next query reconnects (and re-checks the schema). */
export async function closeDb(): Promise<void> {
  const p = pool;
  pool = undefined;
  ready = undefined;
  await p?.end();
}
