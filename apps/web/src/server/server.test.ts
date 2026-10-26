// @vitest-environment node
/**
 * The API against a real Postgres. Needs TEST_DATABASE_URL (e.g. a local
 * postgres://postgres:postgres@127.0.0.1:5432/stepq_test); skipped without it. All server
 * tests live in this one file because they share that database.
 */
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

/* eslint-disable @typescript-eslint/no-explicit-any -- API replies are checked field by field below. */
const url = process.env.TEST_DATABASE_URL;
process.env.DATABASE_URL = url ?? '';
process.env.ACTION_SIGNING_SECRET = 'test-secret';
process.env.SITE_URL = 'https://stepq.test';
process.env.FOUNDER_INBOX = 'connect@stepq.in';
process.env.MAIL_TRANSPORT = '';

const { closeDb, query } = await import('./db');
const { handleCall } = await import('./http');
const { deliverPendingMail, setMailTransport, MAX_ATTEMPTS } = await import('./mail');
const { signToken } = await import('./signedToken');
const { GET: resumeGET } = await import('../app/api/resume/route');
const { GET: statsGET } = await import('../app/api/public/stats/route');
const { GET: backersGET } = await import('../app/api/public/backers/route');
const { POST: chunkPOST } = await import('../app/api/chunk/route');

let ipSeq = 0;
/** Each call gets a fresh IP unless one is given, so rate limits only bite where tested. */
async function api(name: string, data: unknown, ip = `10.0.${ipSeq >> 8}.${ipSeq++ & 255}`) {
  const res = await handleCall(
    name,
    new Request(`https://stepq.test/api/${name}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `9.9.9.9, ${ip}` },
      body: JSON.stringify(data),
    }),
  );
  return { status: res.status, body: (await res.json()) as { result?: any; error?: any } };
}
async function ok(name: string, data: unknown, ip?: string) {
  const r = await api(name, data, ip);
  if (r.status !== 200) throw new Error(`${name}: ${JSON.stringify(r.body)}`);
  return r.body.result;
}

type Mail = {
  to_addr: string;
  template: string;
  props: any;
  reply_to: string | null;
  status: string;
  attempts: number;
};
const mails = async (template?: string) =>
  (
    await query<Mail>(
      `select * from stepq.mail ${template ? 'where template = $1' : ''} order by id`,
      template ? [template] : [],
    )
  ).rows;
const tokenOf = (link: string) => new URL(link).searchParams.get('token')!;

const join = (over: Record<string, unknown> = {}) => ({
  name: 'Riya Sharma',
  email: 'riya@gmail.com',
  gender: 'female',
  ageGroup: '25_34',
  website: '',
  requestId: randomUUID(),
  ...over,
});
const backing = (over: Record<string, unknown> = {}) => ({
  name: 'Riya Sharma',
  phone: '9876543210',
  amount: 501,
  showOnWall: true,
  website: '',
  requestId: randomUUID(),
  ...over,
});
const ambassador = (over: Record<string, unknown> = {}) => ({
  name: 'Riya Sharma',
  email: 'riya@gmail.com',
  phone: '9876543210',
  city: 'Mumbai',
  instagram: '@Riya.Walks',
  followers: '1k_10k',
  collegeOrCompany: 'St. Xavier’s College',
  plan: 'I will organise weekend walks with my friends.',
  agreedToTerms: true,
  website: '',
  requestId: randomUUID(),
  ...over,
});
const founder = (over: Record<string, unknown> = {}) => ({
  name: 'Riya Sharma',
  email: 'riya@gmail.com',
  phone: '98765 43210',
  topic: 'partnership',
  message: 'We run a college in Pune.\nCan we talk?',
  website: '',
  requestId: randomUUID(),
  ...over,
});
const fixture = (n: string) =>
  readFileSync(fileURLToPath(new URL(`./fixtures/${n}`, import.meta.url)));
const team = (bytes: Buffer, over: Record<string, unknown> = {}) => ({
  name: 'Aarav Mehta',
  email: 'aarav@gmail.com',
  phone: '9876543210',
  role: 'design',
  why: 'I love building calm, useful products.',
  resume: { fileName: 'resume.pdf', base64: bytes.toString('base64') },
  website: '',
  requestId: randomUUID(),
  ...over,
});

describe.skipIf(!url)('API on Postgres', () => {
  beforeAll(async () => {
    await closeDb();
    const pg = await import('pg');
    const c = new pg.default.Client({ connectionString: url });
    await c.connect();
    await c.query('drop schema if exists stepq cascade');
    await c.end();
  });
  beforeEach(async () => {
    setMailTransport(undefined);
    await query(`truncate stepq.waitlist, stepq.team_applications, stepq.ambassador_applications,
      stepq.backings, stepq.founder_messages, stepq.mail, stepq.rate_limits, stepq.requests, stepq.chunks`);
    await query('update stepq.stats set waitlist_count = 0');
  });
  afterAll(() => closeDb());

  describe('waitlist', () => {
    it('joins with sequential positions and a live count', async () => {
      const a = await ok('joinWaitlist', join());
      expect(a).toMatchObject({ status: 'joined', position: 1, email: 'riya@gmail.com' });
      expect(a.reserveToken).toBeTruthy();
      const b = await ok('joinWaitlist', join({ email: 'sam@gmail.com' }));
      expect(b).toMatchObject({ status: 'joined', position: 2 });
      expect(await (await statsGET()).json()).toEqual({ waitlistCount: 2 });
    });

    it('concurrent joins get unique, gap-free positions', async () => {
      const rs = await Promise.all(
        Array.from({ length: 8 }, (_, i) => ok('joinWaitlist', join({ email: `p${i}@gmail.com` }))),
      );
      expect(rs.map((r) => r.position).sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('a differently-cased email is existing and gets the reserve link by mail', async () => {
      await ok('joinWaitlist', join());
      const again = await ok('joinWaitlist', join({ email: ' Riya@Gmail.com ' }));
      expect(again).toEqual({ status: 'existing', position: 1, email: 'riya@gmail.com' });
      const [m] = await mails('reserveLink');
      expect(m).toMatchObject({ to_addr: 'riya@gmail.com', status: 'queued' });
      expect(m!.props).toMatchObject({ firstName: 'Riya', position: 1 });
      expect(m!.props.reserveUrl).toMatch(/^https:\/\/stepq\.test\/\?modal=reserve&token=/);
      expect(await (await statsGET()).json()).toEqual({ waitlistCount: 1 });
    });

    it('no reserve-link mail once a username is reserved', async () => {
      const a = await ok('joinWaitlist', join());
      await ok('reserveUsername', { username: 'riya.walks', reserveToken: a.reserveToken });
      await ok('joinWaitlist', join());
      expect(await mails('reserveLink')).toHaveLength(0);
    });

    it('is idempotent on requestId', async () => {
      const d = join();
      const a = await ok('joinWaitlist', d);
      const b = await ok('joinWaitlist', d);
      expect(b).toEqual(a);
      expect(await (await statsGET()).json()).toEqual({ waitlistCount: 1 });
    });

    it('rejects a filled honeypot with field details', async () => {
      const r = await api('joinWaitlist', join({ website: 'spam' }));
      expect(r.status).toBe(400);
      expect(r.body.error.code).toBe('invalid-argument');
      expect(r.body.error.details.fields).toHaveProperty('website');
    });

    it('rate limits joins at 10 per window per IP, using the rightmost hop', async () => {
      for (let i = 0; i < 10; i++)
        await ok('joinWaitlist', join({ email: `r${i}@gmail.com` }), '7.7.7.7');
      const r = await api('joinWaitlist', join({ email: 'r10@gmail.com' }), '7.7.7.7');
      expect(r.status).toBe(429);
      expect(r.body.error).toMatchObject({ code: 'resource-exhausted' });
      await ok('joinWaitlist', join({ email: 'other@gmail.com' }), '7.7.7.8');
    });

    it('checkUsername reports invalid, reserved, taken and available', async () => {
      const a = await ok('joinWaitlist', join());
      await ok('reserveUsername', { username: 'Riya.Walks', reserveToken: a.reserveToken });
      expect(await ok('checkUsername', { username: 'a' })).toEqual({
        available: false,
        reason: 'invalid',
      });
      expect(await ok('checkUsername', { username: 'admin' })).toEqual({
        available: false,
        reason: 'reserved',
      });
      expect(await ok('checkUsername', { username: 'riya.walks' })).toEqual({
        available: false,
        reason: 'taken',
      });
      expect(await ok('checkUsername', { username: 'sam.walks' })).toEqual({ available: true });
    });

    it('reserveUsername: once per entry; a taken name is a field error', async () => {
      const a = await ok('joinWaitlist', join());
      const b = await ok('joinWaitlist', join({ email: 'sam@gmail.com' }));
      expect(
        await ok('reserveUsername', { username: 'Riya.Walks', reserveToken: a.reserveToken }),
      ).toEqual({
        username: 'riya.walks',
      });
      const again = await api('reserveUsername', {
        username: 'other',
        reserveToken: a.reserveToken,
      });
      expect(again.body.error).toEqual({
        code: 'failed-precondition',
        message: 'You already reserved @riya.walks',
      });
      const clash = await api('reserveUsername', {
        username: 'riya.walks',
        reserveToken: b.reserveToken,
      });
      expect(clash.body.error).toMatchObject({
        code: 'already-exists',
        details: { fields: { username: 'Taken. Try another.' } },
      });
    });

    it('two concurrent reserves of one name: exactly one wins', async () => {
      const a = await ok('joinWaitlist', join());
      const b = await ok('joinWaitlist', join({ email: 'sam@gmail.com' }));
      const rs = await Promise.all([
        api('reserveUsername', { username: 'walker', reserveToken: a.reserveToken }),
        api('reserveUsername', { username: 'walker', reserveToken: b.reserveToken }),
      ]);
      expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    });

    it('rejects an expired or malformed reserve token', async () => {
      const a = await ok('joinWaitlist', join());
      const [, id] = [
        0,
        JSON.parse(Buffer.from(a.reserveToken.split('.')[0], 'base64url').toString()).id,
      ];
      const expired = signToken({ k: 'reserve', id, exp: Date.now() - 1 });
      for (const reserveToken of [expired, 'junk', `${a.reserveToken}x`]) {
        const r = await api('reserveUsername', { username: 'riya.walks', reserveToken });
        expect(r.body.error).toEqual({
          code: 'permission-denied',
          message: 'This link is not valid.',
        });
      }
    });
  });

  describe('backing and the wall', () => {
    it('records a pending backing, alerts the founder and returns the UPI link', async () => {
      const r = await ok('recordBacking', backing());
      expect(r.amount).toBe(501);
      expect(r.reference).toMatch(/^[A-Z0-9]+/);
      expect(r.upiLink).toContain('am=501');
      const [m] = await mails('backingAlert');
      expect(m).toMatchObject({ to_addr: 'connect@stepq.in' });
      expect(m!.props).toMatchObject({
        name: 'Riya Sharma',
        amount: 501,
        reference: r.reference,
        showOnWall: true,
      });
      expect(m!.props.verifyUrl).toMatch(/^https:\/\/stepq\.test\/confirm\?token=/);
    });

    it('is idempotent on requestId (same reference, one row)', async () => {
      const d = backing();
      const a = await ok('recordBacking', d);
      expect(await ok('recordBacking', d)).toEqual(a);
      expect((await query('select 1 from stepq.backings')).rowCount).toBe(1);
    });

    it('describe, then verify once (even concurrently): the wall lists the name once', async () => {
      await ok('recordBacking', backing());
      const token = tokenOf((await mails('backingAlert'))[0]!.props.verifyUrl);
      expect(await ok('describeAction', { token })).toEqual({
        kind: 'verifyBacking',
        summary: expect.stringMatching(/^Verify ₹501 from Riya S\.? \(ref .+\)\?$/),
        done: false,
      });
      await Promise.all([ok('confirmAction', { token }), ok('confirmAction', { token })]);
      await ok('confirmAction', { token });
      expect((await ok('describeAction', { token })).done).toBe(true);
      const wall = (await (await backersGET()).json()) as { names: string[] };
      expect(wall.names).toHaveLength(1);
    });

    it('keeps opted-out backers off the wall and lists others in verify order', async () => {
      await ok('recordBacking', backing({ name: 'Hidden Person', showOnWall: false }));
      await ok('recordBacking', backing({ name: 'Sam Rao' }));
      await ok('recordBacking', backing({ name: 'Asha Iyer' }));
      const [hidden, sam, asha] = (await mails('backingAlert')).map((m) =>
        tokenOf(m.props.verifyUrl),
      );
      for (const token of [asha!, hidden!, sam!]) await ok('confirmAction', { token });
      const wall = (await (await backersGET()).json()) as { names: string[] };
      expect(wall.names.map((n) => n.split(' ')[0])).toEqual(['Asha', 'Sam']);
    });
  });

  describe('ambassador', () => {
    it('stores a pending application, alerts the founder with replyTo, approves once', async () => {
      expect(await ok('submitAmbassador', ambassador())).toEqual({ firstName: 'Riya' });
      const [alert] = await mails('ambassadorAlert');
      expect(alert).toMatchObject({ to_addr: 'connect@stepq.in', reply_to: 'riya@gmail.com' });
      expect(alert!.props).toMatchObject({
        city: 'Mumbai',
        instagramUrl: expect.stringContaining('instagram.com/'),
      });
      const token = tokenOf(alert!.props.approveUrl);
      expect(await ok('describeAction', { token })).toEqual({
        kind: 'approveAmbassador',
        summary: 'Approve Riya Sharma (Mumbai) as an ambassador?',
        done: false,
      });
      await Promise.all([ok('confirmAction', { token }), ok('confirmAction', { token })]);
      const approved = await mails('ambassadorApproved');
      expect(approved).toHaveLength(1);
      expect(approved[0]).toMatchObject({
        to_addr: 'riya@gmail.com',
        props: { firstName: 'Riya', city: 'Mumbai' },
      });
    });

    it('rejects reserve tokens, junk, expired tokens and unknown applications', async () => {
      const id = randomUUID();
      const cases = [
        [signToken({ k: 'reserve', id, exp: Date.now() + 60_000 }), 'permission-denied'],
        ['junk', 'permission-denied'],
        [signToken({ k: 'approveAmbassador', id, exp: Date.now() - 1 }), 'permission-denied'],
        [signToken({ k: 'approveAmbassador', id, exp: Date.now() + 60_000 }), 'not-found'],
      ] as const;
      for (const [token, code] of cases) {
        expect((await api('confirmAction', { token })).body.error.code).toBe(code);
      }
    });

    it('rate limits submissions at 5 per window', async () => {
      for (let i = 0; i < 5; i++) await ok('submitAmbassador', ambassador(), '6.6.6.6');
      expect((await api('submitAmbassador', ambassador(), '6.6.6.6')).status).toBe(429);
    });
  });

  describe('founder message', () => {
    it('stores it and alerts the founder, replying to the sender; idempotent', async () => {
      const d = founder();
      expect(await ok('sendFounderMessage', d)).toEqual({ firstName: 'Riya' });
      await ok('sendFounderMessage', d);
      const ms = await mails('founderMessage');
      expect(ms).toHaveLength(1);
      expect(ms[0]).toMatchObject({ to_addr: 'connect@stepq.in', reply_to: 'riya@gmail.com' });
      expect(ms[0]!.props).toMatchObject({ topicLabel: expect.any(String), message: d.message });
    });

    it('accepts an empty phone and omits it from the mail', async () => {
      await ok('sendFounderMessage', founder({ phone: '' }));
      expect((await mails('founderMessage'))[0]!.props).not.toHaveProperty('phone');
    });
  });

  describe('team application', () => {
    it('stores the PDF and alerts the founder with a working, signed résumé link', async () => {
      const pdf = fixture('resume.pdf');
      expect(await ok('submitTeamApplication', team(pdf))).toEqual({ firstName: 'Aarav' });
      const [m] = await mails('teamApplicationAlert');
      expect(m).toMatchObject({ to_addr: 'connect@stepq.in', reply_to: 'aarav@gmail.com' });
      const link = m!.props.resumeUrl as string;
      expect(link).toMatch(/^https:\/\/stepq\.test\/api\/resume\?token=/);
      const res = await resumeGET(new Request(link));
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toBe('application/pdf');
      expect(Buffer.from(await res.arrayBuffer()).equals(pdf)).toBe(true);
      expect((await resumeGET(new Request(`${link}x`))).status).toBe(403);
    });

    it('rejects a fake PDF, an empty file and invalid base64 on the resume field', async () => {
      const bad = [
        team(fixture('fake.pdf')),
        team(Buffer.alloc(0)),
        { ...team(fixture('resume.pdf')), resume: { fileName: 'r.pdf', base64: '%%%notbase64' } },
      ];
      for (const d of bad) {
        const r = await api('submitTeamApplication', d);
        expect(r.status).toBe(400);
        expect(r.body.error.details.fields.resume).toBeTruthy();
      }
    });

    it('a 5 MB résumé goes up in chunks and is reassembled', async () => {
      const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(5 * 1024 * 1024 - 9, 7)]);
      const body = JSON.stringify(team(pdf));
      const id = randomUUID();
      const size = 3_000_000;
      const total = Math.ceil(body.length / size);
      expect(total).toBe(3);
      for (let index = 0; index < total; index++) {
        const res = await chunkPOST(
          new Request('https://stepq.test/api/chunk', {
            method: 'POST',
            body: JSON.stringify({
              id,
              index,
              total,
              part: body.slice(index * size, (index + 1) * size),
            }),
          }),
        );
        expect(res.status).toBe(200);
      }
      const res = await handleCall(
        'submitTeamApplication',
        new Request('https://stepq.test/api/submitTeamApplication', {
          method: 'POST',
          headers: { 'x-stepq-chunks': `${id}:${total}` },
        }),
      );
      expect(await res.json()).toEqual({ result: { firstName: 'Aarav' } });
      const { rows } = await query<{ n: number }>(
        'select length(resume) as n from stepq.team_applications',
      );
      expect(rows[0]!.n).toBe(pdf.length);
      expect((await query('select 1 from stepq.chunks')).rowCount).toBe(0);
    });
  });

  describe('mail delivery', () => {
    it('sends queued mail once, rendered, with the right recipient and reply-to', async () => {
      const sent: { to: string; subject: string; html: string; replyTo?: string }[] = [];
      setMailTransport(async (m) => void sent.push(m));
      await ok('sendFounderMessage', founder());
      expect(await deliverPendingMail()).toBe(1);
      expect(await deliverPendingMail()).toBe(0);
      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({ to: 'connect@stepq.in', replyTo: 'riya@gmail.com' });
      expect(sent[0]!.subject).toBeTruthy();
      expect(sent[0]!.html).toContain('Pune');
      expect((await mails())[0]).toMatchObject({ status: 'sent', attempts: 1 });
    });

    it('a failing send stays queued for a retry, then gives up after MAX_ATTEMPTS', async () => {
      setMailTransport(async () => {
        throw new Error('smtp down');
      });
      await ok('sendFounderMessage', founder());
      await deliverPendingMail();
      expect((await mails())[0]).toMatchObject({ status: 'queued', attempts: 1 });
      // Not retried immediately.
      await deliverPendingMail();
      expect((await mails())[0]!.attempts).toBe(1);
      await query(
        `update stepq.mail set attempts = $1, updated_at = now() - interval '2 minutes'`,
        [MAX_ATTEMPTS - 1],
      );
      await deliverPendingMail();
      expect((await mails())[0]).toMatchObject({ status: 'failed', attempts: MAX_ATTEMPTS });
    });

    it('with no transport configured, mail stays queued', async () => {
      setMailTransport(null);
      await ok('sendFounderMessage', founder());
      expect(await deliverPendingMail()).toBe(0);
      expect((await mails())[0]).toMatchObject({ status: 'queued', attempts: 0 });
    });
  });

  describe('http', () => {
    it('unknown endpoints are 404 and cross-site posts are refused', async () => {
      expect((await api('dropTables', {})).status).toBe(404);
      const res = await handleCall(
        'checkUsername',
        new Request('https://stepq.test/api/checkUsername', {
          method: 'POST',
          headers: { origin: 'https://evil.example', host: 'stepq.test' },
          body: JSON.stringify({ username: 'x' }),
        }),
      );
      expect(res.status).toBe(403);
    });

    it('tables are not reachable through Supabase’s public REST roles (RLS on)', async () => {
      const { rows } = await query<{ relname: string; relrowsecurity: boolean }>(
        `select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'stepq' and c.relkind = 'r'`,
      );
      expect(rows.length).toBe(10);
      expect(rows.every((r) => r.relrowsecurity)).toBe(true);
    });
  });
});
