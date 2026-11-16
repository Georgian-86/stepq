// @vitest-environment node
/**
 * Push notifications: the copy, when each nudge fires, the Firebase request, and (with
 * TEST_DATABASE_URL) queueing and sending against a real Postgres, in a database of its own.
 */
import { createVerify, generateKeyPairSync, randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAMPAIGN_IDEAS, NUDGES, fill, pickLine } from '@/lib/pushCopy';

const base = process.env.TEST_DATABASE_URL;
const DB = 'stepq_push_test';
process.env.DATABASE_URL = base ? `${base.replace(/\/[^/]*$/, '')}/${DB}` : '';
process.env.ACTION_SIGNING_SECRET = 'test-secret';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const SA = {
  project_id: 'stepq-test',
  client_email: 'push@stepq-test.iam.gserviceaccount.com',
  private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
};
process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(SA);

const fcm = await import('./fcm');
const deliver = await import('./deliver');
const { query, closeDb } = await import('../db');
const { asUser, ensureAdminSchema } = await import('../admin/data');

describe('copy', () => {
  const all = [...Object.values(NUDGES).flat(), ...CAMPAIGN_IDEAS];

  it('keeps titles short enough for the lock screen and messages to two lines', () => {
    for (const line of all) {
      expect(fill(line.title, {}).length, line.title).toBeLessThanOrEqual(45);
      expect(fill(line.body, {}).length, line.body).toBeLessThanOrEqual(120);
    }
  });

  it('only uses known placeholders, and never leaves one unfilled', () => {
    for (const line of all) {
      const text = `${line.title} ${line.body}`;
      expect(text.replace(/\{(name|steps|goal|left|km|streak)\}/g, '')).not.toMatch(/[{}]/);
      expect(fill(text, {})).not.toMatch(/[{}]/);
    }
  });

  it('fills values in Indian number format, and falls back when one is missing', () => {
    expect(
      fill('{name}: {steps} of {goal}, {left} left', {
        name: 'Riya',
        steps: 6240,
        goal: 12000,
        left: 5760,
      }),
    ).toBe('Riya: 6,240 of 12,000, 5,760 left');
    expect(fill('Hi {name}, {left} to go', {})).toBe('Hi friend, a few more to go');
  });

  it('picks the same line for a person on a day, and varies across days', () => {
    expect(pickLine('morning', 'u1', '2026-11-16')).toEqual(
      pickLine('morning', 'u1', '2026-11-16'),
    );
    const week = new Set(
      Array.from({ length: 7 }, (_, i) => pickLine('morning', 'u1', `2026-11-${10 + i}`).title),
    );
    expect(week.size).toBeGreaterThan(2);
  });
});

describe('when nudges fire', () => {
  const day = '2026-11-16';
  const h = (hh: number, mm = 0) => hh * 60 + mm;
  const goal = 8000;
  const days = (n: number, steps: number) =>
    Array.from({ length: n }, (_, i) => ({
      day: new Date(Date.parse(`${day}T00:00:00Z`) - (i + 1) * 86_400_000)
        .toISOString()
        .slice(0, 10),
      steps,
    }));
  const pick = (
    steps: number,
    history: { day: string; steps: number }[],
    minutes: number,
    sent: string[] = [],
  ) =>
    deliver.chooseNudge({ steps, daily_goal: goal }, history, minutes, day, new Set(sent))?.kind ??
    null;

  it('reads the India clock', () => {
    expect(deliver.indiaClock(new Date('2026-11-16T13:00:00Z'))).toEqual({
      minutes: h(18, 30),
      day,
    });
    expect(deliver.indiaClock(new Date('2026-11-16T19:00:00Z'))).toEqual({
      minutes: h(0, 30),
      day: '2026-11-17',
    });
  });

  it('morning kick-off only before 500 steps, for people who walked recently', () => {
    expect(pick(0, days(1, 9000), h(8, 15))).toBe('morning');
    expect(pick(900, days(1, 9000), h(8, 15))).toBeNull();
    expect(pick(0, [], h(8, 15))).toBeNull();
  });

  it('evening: behind or close, by how far along the day is', () => {
    expect(pick(2000, [], h(19))).toBe('evening_behind');
    expect(pick(6000, [], h(19))).toBe('evening_close');
    expect(pick(6000, [], h(19), ['evening'])).toBeNull();
  });

  it('streak at risk after 2+ days in a row at goal', () => {
    expect(deliver.streakBefore(day, goal, days(5, 9000))).toBe(5);
    expect(pick(3000, days(5, 9000), h(21))).toBe('streak_risk');
    expect(pick(3000, days(1, 9000), h(21))).toBeNull();
  });

  it('celebrates the goal once, even over the daily cap', () => {
    expect(pick(8100, [], h(13))).toBe('goal_reached');
    expect(pick(8100, [], h(13), ['goal_reached'])).toBeNull();
    expect(pick(8100, [], h(13), ['a', 'b', 'c', 'd'])).toBe('goal_reached');
    expect(pick(100, [], h(11, 45), ['a', 'b', 'c', 'd'])).toBeNull();
  });

  it('water twice a day, comeback after 3 or 7 quiet days, nothing at night', () => {
    expect(pick(3000, [], h(11, 45))).toBe('water');
    expect(pick(3000, [], h(16, 45), ['water_am'])).toBe('water');
    const quiet = (n: number) => [{ day: days(n, 0)[n - 1]!.day, steps: 5000 }];
    expect(pick(0, quiet(3), h(10, 30))).toBe('comeback');
    expect(pick(0, quiet(4), h(10, 30))).toBeNull();
    expect(pick(0, days(2, 9000), h(23))).toBeNull();
    expect(pick(0, days(2, 9000), h(6))).toBeNull();
  });
});

type Call = { url: string; body: unknown; auth: string | null };

/** Stands in for Google: answers the token exchange, and FCM sends per `fcmStatus`. */
function fakeGoogle(fcmStatus: (token: string) => number = () => 200) {
  const calls: Call[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const auth = new Headers(init.headers).get('authorization');
      if (url.startsWith('https://oauth2.googleapis.com/token')) {
        calls.push({ url, body: String(init.body), auth });
        return Response.json({ access_token: 'access-1', expires_in: 3600 });
      }
      const body = JSON.parse(String(init.body)) as { message: { token: string } };
      calls.push({ url, body, auth });
      const status = fcmStatus(body.message.token);
      return status === 200
        ? Response.json({ name: 'projects/x/messages/1' })
        : Response.json(
            { error: { status: status === 404 ? 'NOT_FOUND' : 'INTERNAL' } },
            { status },
          );
    }),
  );
  return calls;
}

describe('Firebase request', () => {
  beforeEach(() => fcm.resetFcmToken());

  it('reads the service account from JSON or base64, fixing escaped line breaks', () => {
    const escaped = JSON.stringify({ ...SA, private_key: SA.private_key.replace(/\n/g, '\\n') });
    expect(fcm.serviceAccount(Buffer.from(escaped).toString('base64'))?.private_key).toBe(
      SA.private_key,
    );
    expect(fcm.serviceAccount('')).toBeNull();
    expect(() => fcm.serviceAccount('{"project_id":"x"}')).toThrow(/missing/);
  });

  it('signs a JWT for the messaging scope that verifies with the public key', () => {
    const jwt = fcm.signedAssertion(SA, 1_700_000_000);
    const [h, c, sig] = jwt.split('.');
    const claims = JSON.parse(Buffer.from(c!, 'base64url').toString());
    expect(claims).toMatchObject({
      iss: SA.client_email,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      exp: 1_700_003_600,
    });
    const v = createVerify('RSA-SHA256');
    v.update(`${h}.${c}`);
    expect(v.verify(publicKey, Buffer.from(sig!, 'base64url'))).toBe(true);
  });

  it('sends a high-priority data message, reusing the access token', async () => {
    const calls = fakeGoogle((t) => (t === 'dead' ? 404 : 200));
    const data = { title: 'Hi', body: 'There', channel: 'nudges', kind: 'morning', image: '' };
    expect(await fcm.sendPush('tok', data)).toBe('ok');
    expect(await fcm.sendPush('dead', data)).toBe('gone');
    expect(calls.filter((c) => c.url.includes('oauth2'))).toHaveLength(1);
    const send = calls.find((c) => c.url.includes('fcm.googleapis.com'))!;
    expect(send.url).toBe('https://fcm.googleapis.com/v1/projects/stepq-test/messages:send');
    expect(send.auth).toBe('Bearer access-1');
    expect(send.body).toEqual({
      message: {
        token: 'tok',
        data: { title: 'Hi', body: 'There', channel: 'nudges', kind: 'morning' },
        android: { priority: 'HIGH', ttl: '21600s' },
      },
    });
  });
});

describe.skipIf(!base)('sending (Postgres)', () => {
  const admin = { id: randomUUID(), email: 'admin@stepq.in' };
  const stranger = { id: randomUUID(), email: 'someone@gmail.com' };
  const riya = randomUUID();
  const arjun = randomUUID();

  beforeAll(async () => {
    const c = new pg.Client({ connectionString: base });
    await c.connect();
    await c.query(`drop database if exists ${DB}`);
    await c.query(`create database ${DB}`);
    await c.end();
    await ensureAdminSchema();
    // The parts of the app's schema (stepq-app repo) that pushes read.
    await query(`
      create schema app;
      create table app.profiles (id uuid primary key, display_name text, username text, daily_goal int not null default 8000);
      create table app.daily_steps (user_id uuid, day date, steps int, distance_m int default 0, primary key (user_id, day));
      create table app.push_tokens (token text primary key, user_id uuid not null);
    `);
    await query('insert into stepq.admins (user_id, email) values ($1, $2)', [
      admin.id,
      admin.email,
    ]);
  });

  afterAll(async () => {
    await closeDb();
  });

  beforeEach(async () => {
    fcm.resetFcmToken();
    await query(
      'truncate stepq.push_campaigns, stepq.push_sends, app.profiles, app.daily_steps, app.push_tokens',
    );
    await query(
      `insert into app.profiles values ($1, 'Riya Sharma', 'riya.walks', 8000), ($2, 'Arjun', 'arjun', 10000)`,
      [riya, arjun],
    );
    await query(
      `insert into app.push_tokens values ('riya-phone', $1), ('riya-old', $1), ('arjun-phone', $2)`,
      [riya, arjun],
    );
  });

  const queue = (
    who: { id: string; email: string },
    audience = 'everyone',
    username = '',
    sendAt: string | null = null,
  ) =>
    asUser(who, (c) =>
      c.query('select stepq.queue_push($1, $2, $3, $4, $5, $6, $7)', [
        'Hey {name}',
        'Only {left} steps to go',
        audience,
        username,
        '',
        'challenges',
        sendAt,
      ]),
    );

  it('only admins can queue a push, and nobody can write the tables directly', async () => {
    await expect(queue(stranger)).rejects.toThrow(/Only admins/);
    await expect(
      asUser(admin, (c) =>
        c.query(
          `insert into stepq.push_campaigns (title, body, audience) values ('a', 'b', 'everyone')`,
        ),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(queue(admin, 'username', '')).rejects.toThrow(/username/);
    await queue(admin);
    const { rows } = await asUser(stranger, (c) => c.query('select * from stepq.push_campaigns'));
    expect(rows).toHaveLength(0);
  });

  it('sends a due push to every phone, personalised, and drops dead tokens', async () => {
    const calls = fakeGoogle((t) => (t === 'riya-old' ? 404 : 200));
    await query(
      `insert into app.daily_steps values ($1, (now() at time zone 'Asia/Kolkata')::date, 6240)`,
      [riya],
    );
    await queue(admin);
    await queue(admin, 'everyone', '', new Date(Date.now() + 3_600_000).toISOString()); // later
    expect(await deliver.deliverCampaigns()).toBe(1);
    const sends = calls
      .filter((c) => c.url.includes('fcm'))
      .map((c) => (c.body as { message: { token: string; data: Record<string, string> } }).message);
    expect(sends.map((m) => m.token).sort()).toEqual(['arjun-phone', 'riya-old', 'riya-phone']);
    const toRiya = sends.find((m) => m.token === 'riya-phone')!.data;
    expect(toRiya).toEqual({
      title: 'Hey Riya',
      body: 'Only 1,760 steps to go',
      channel: 'news',
      kind: 'campaign',
      route: 'challenges',
    });
    const { rows } = await query(
      `select status, recipients, delivered, failed from stepq.push_campaigns order by send_at`,
    );
    expect(rows).toEqual([
      { status: 'sent', recipients: 2, delivered: 2, failed: 1 },
      { status: 'queued', recipients: null, delivered: null, failed: null },
    ]);
    expect(
      (await query('select token from app.push_tokens order by 1')).rows.map((r) => r.token),
    ).toEqual(['arjun-phone', 'riya-phone']);
    expect(await deliver.deliverCampaigns()).toBe(0); // the scheduled one is not due yet
  });

  it('a push to an unknown username fails with a reason', async () => {
    fakeGoogle();
    await queue(admin, 'username', '@Nobody');
    await deliver.deliverCampaigns();
    const { rows } = await query('select status, username, error from stepq.push_campaigns');
    expect(rows[0]).toMatchObject({
      status: 'failed',
      username: 'nobody',
      error: expect.stringMatching(/no phone/),
    });
  });

  it('sends each nudge once per person per day', async () => {
    const calls = fakeGoogle();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    await query(`insert into app.daily_steps values ($1, $2, 6500), ($3, $2, 10200)`, [
      riya,
      today,
      arjun,
    ]);
    // 19:00 India time today: Riya is close to her goal, Arjun has hit his.
    const evening = new Date(`${today}T13:30:00Z`);
    expect(await deliver.runNudges(evening)).toBe(2);
    expect(await deliver.runNudges(evening)).toBe(0);
    const kinds = calls
      .filter((c) => c.url.includes('fcm'))
      .map((c) => (c.body as { message: { token: string; data: { kind: string } } }).message)
      .map((m) => `${m.token}:${m.data.kind}`)
      .sort();
    expect(kinds).toEqual([
      'arjun-phone:goal_reached',
      'riya-old:evening_close',
      'riya-phone:evening_close',
    ]);
    const { rows } = await query('select kind from stepq.push_sends order by kind');
    expect(rows.map((r) => r.kind)).toEqual(['evening', 'goal_reached']);
  });
});
