import pg from 'pg';
import { env } from './env';
import { SCHEMA_SQL } from './schema';

export type Client = pg.PoolClient;

let pool: pg.Pool | undefined;
let ready: Promise<void> | undefined;

function isLocal(url: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '::1'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

function getPool(): pg.Pool {
  if (pool) return pool;
  const url = env.databaseUrl();
  if (!url) throw new Error('DATABASE_URL is not set');
  // Supabase's pooler serves TLS with its own CA; the connection string carries the password.
  const u = new URL(url);
  u.searchParams.delete('sslmode');
  pool = new pg.Pool({
    connectionString: u.toString(),
    ssl: isLocal(url) ? undefined : { rejectUnauthorized: false },
    // Serverless: few connections per instance; the Supabase pooler multiplexes the rest.
    max: 3,
    idleTimeoutMillis: 10_000,
  });
  pool.on('error', () => {}); // an idle client dropped by the pooler is replaced on next use
  return pool;
}

/** Creates the tables on the first query of each server instance (idempotent, serialised). */
function ensureSchema(): Promise<void> {
  ready ??= (async () => {
    const c = await getPool().connect();
    try {
      await c.query('begin');
      await c.query('select pg_advisory_xact_lock(72787)');
      await c.query(SCHEMA_SQL);
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
