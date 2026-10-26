// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authConfigured, getUser, secondsLeft, signInWithPassword, supabaseUrl } from './gotrue';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const jwt = (payload: object) =>
  `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`;

describe('admin auth (Supabase GoTrue)', () => {
  it('derives the project URL from the pooler user in DATABASE_URL', () => {
    vi.stubEnv('SUPABASE_URL', '');
    // Built from parts so secret scanners do not read it as a real connection string.
    const user = ['postgres', 'abcdefghijklmnopqrst'].join('.');
    vi.stubEnv('DATABASE_URL', `postgresql://${user}:x@pooler.example.com:6543/postgres`);
    expect(supabaseUrl()).toBe('https://abcdefghijklmnopqrst.supabase.co');
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co/');
    expect(supabaseUrl()).toBe('https://example.supabase.co');
  });

  it('is not configured without the anon key', () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', '');
    expect(authConfigured()).toBe(false);
    vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_x');
    expect(authConfigured()).toBe(true);
  });

  it('signs in with the anon key only, and maps wrong credentials to null', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon');
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      const { password } = JSON.parse(String(init.body)) as { password: string };
      return password === 'right'
        ? Response.json({
            access_token: 'a',
            refresh_token: 'r',
            user: { id: 'u1', email: 'e@x.y' },
          })
        : Response.json({ error: 'invalid_grant' }, { status: 400 });
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await signInWithPassword('e@x.y', 'wrong')).toBeNull();
    expect(await signInWithPassword('e@x.y', 'right')).toEqual({
      accessToken: 'a',
      refreshToken: 'r',
      user: { id: 'u1', email: 'e@x.y' },
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://example.supabase.co/auth/v1/token?grant_type=password');
    expect((init.headers as Record<string, string>).apikey).toBe('anon');
  });

  it('asks Supabase who a token belongs to', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'anon');
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init: RequestInit) =>
        (init.headers as Record<string, string>).Authorization === 'Bearer good'
          ? Response.json({ id: 'u1', email: 'e@x.y' })
          : new Response('{}', { status: 401 }),
      ),
    );
    expect(await getUser('good')).toEqual({ id: 'u1', email: 'e@x.y' });
    expect(await getUser('forged')).toBeNull();
  });

  it('reads a token’s expiry', () => {
    expect(secondsLeft(jwt({ exp: Date.now() / 1000 + 600 }))).toBeGreaterThan(590);
    expect(secondsLeft('garbage')).toBe(0);
  });
});
