// @vitest-environment node
import { afterEach, describe, expect, it } from 'vitest';
import { parseDatabaseUrl } from './db';
import { loggable } from './errors';

const FAKE = './Ab/C-+x_$9@q';

describe('parseDatabaseUrl', () => {
  it('takes a raw password with / @ $ + and a stray line break', () => {
    const cfg = parseDatabaseUrl(
      `postgresql://postgres.ref:${FAKE}\n@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`,
    );
    expect(cfg).toMatchObject({
      user: 'postgres.ref',
      password: FAKE,
      host: 'aws-0-ap-south-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
    });
  });

  it('decodes a URL-encoded password and ignores query options; local needs no TLS', () => {
    expect(
      parseDatabaseUrl(
        `postgres://u:${encodeURIComponent(FAKE)}@db.example.com/app?sslmode=require`,
      ),
    ).toMatchObject({ password: FAKE, port: 5432, database: 'app' });
    expect(parseDatabaseUrl('postgres://postgres:postgres@127.0.0.1:5432/x').ssl).toBeUndefined();
  });

  it('rejects junk without echoing it', () => {
    expect(() => parseDatabaseUrl(`mysql://u:${FAKE}@h/d`)).toThrow(/^DATABASE_URL is not/);
    try {
      parseDatabaseUrl(`nonsense ${FAKE}`);
    } catch (e) {
      expect((e as Error).message).not.toContain(FAKE);
    }
  });
});

describe('loggable', () => {
  const saved = process.env.DATABASE_URL;
  afterEach(() => {
    process.env.DATABASE_URL = saved;
  });

  it('strips connection strings and the password from error messages', () => {
    process.env.DATABASE_URL = `postgresql://postgres.ref:${FAKE}@host:6543/postgres`;
    const e = Object.assign(new Error(`bad postgresql://postgres.ref:${FAKE}@host near ${FAKE}`), {
      code: 'X1',
    });
    const out = loggable(e);
    expect(JSON.stringify(out)).not.toContain(FAKE);
    expect(out).toMatchObject({ name: 'Error', code: 'X1' });
    expect(out.message).toContain('[database url]');
  });
});
