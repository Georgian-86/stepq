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
const {
  addAdmin,
  asUser,
  deleteAdmin,
  isAdmin,
  listTables,
  readAdmin,
  readTable,
  readResume,
  removeAdmin,
  tableCsv,
  updateAdmin,
} = await import('./admin/data');

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
      // Not retried immediately, nor 4 minutes later; 6 minutes later it is.
      await deliverPendingMail();
      expect((await mails())[0]!.attempts).toBe(1);
      await query(`update stepq.mail set updated_at = now() - interval '4 minutes'`);
      await deliverPendingMail();
      expect((await mails())[0]!.attempts).toBe(1);
      await query(`update stepq.mail set updated_at = now() - interval '6 minutes'`);
      await deliverPendingMail();
      expect((await mails())[0]!.attempts).toBe(2);
      await query(`update stepq.mail set attempts = $1, updated_at = now() - interval '1 day'`, [
        MAX_ATTEMPTS - 1,
      ]);
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
      expect(rows.length).toBeGreaterThanOrEqual(10);
      expect(rows.every((r) => r.relrowsecurity)).toBe(true);
    });
  });

  describe('admin dashboard (RLS)', () => {
    const admin = { id: randomUUID(), email: 'admin@stepq.in' };
    const stranger = { id: randomUUID(), email: 'someone@gmail.com' };
    beforeEach(async () => {
      await isAdmin(admin); // creates stepq.admins and the policies
      await query('delete from stepq.admins');
      await query('insert into stepq.admins (user_id, email) values ($1, $2)', [
        admin.id,
        admin.email,
      ]);
    });

    it('only users listed in stepq.admins are admins', async () => {
      expect(await isAdmin(admin)).toBe(true);
      expect(await isAdmin(stranger)).toBe(false);
    });

    it('a signed-in non-admin sees no rows in any table', async () => {
      await ok('joinWaitlist', join());
      await ok('sendFounderMessage', founder());
      const tables = await asUser(stranger, listTables);
      expect(tables.length).toBeGreaterThan(5);
      expect(tables.every((t) => t.count === 0)).toBe(true);
      expect((await asUser(stranger, (c) => readTable(c, 'waitlist'))).total).toBe(0);
    });

    it('cannot write, even as an admin', async () => {
      await expect(
        asUser(admin, (c) =>
          c.query(`insert into stepq.admins (user_id, email) values ($1, 'x@y.z')`, [stranger.id]),
        ),
      ).rejects.toThrow(/permission denied/);
    });

    it('an admin sees every table, new ones included, with their rows', async () => {
      await ok('joinWaitlist', join());
      await ok('sendFounderMessage', founder());
      await query('create table if not exists stepq.later_table (id int primary key, note text)');
      await query(`insert into stepq.later_table values (1, 'hi') on conflict do nothing`);
      try {
        // A new table is covered once the admin SQL runs again (next server start).
        await query((await import('./admin/schema')).ADMIN_SQL);
        const tables = await asUser(admin, listTables);
        const byName = Object.fromEntries(tables.map((t) => [t.name, t]));
        expect(tables[0]!.name).toBe('waitlist');
        expect(byName.waitlist!.count).toBe(1);
        expect(byName.founder_messages).toMatchObject({ label: 'Reach-outs', count: 1 });
        expect(byName.later_table).toMatchObject({ label: 'later_table', count: 1 });
        expect(byName.rate_limits!.internal).toBe(true);
      } finally {
        await query('drop table stepq.later_table');
      }
    });

    it('reads pages with search, shows files as sizes, exports CSV and résumés', async () => {
      await ok('joinWaitlist', join());
      await ok('joinWaitlist', join({ name: 'Kabir Rao', email: 'kabir@gmail.com' }));
      await ok('submitTeamApplication', team(fixture('resume.pdf')));
      await asUser(admin, async (c) => {
        const all = await readTable(c, 'waitlist');
        expect(all.total).toBe(2);
        expect(all.rows[0]![all.columns.findIndex((col) => col.name === 'name')]).toBe('Kabir Rao');
        const found = await readTable(c, 'waitlist', { search: 'kabir@' });
        expect(found.total).toBe(1);
        expect((await readTable(c, 'waitlist', { search: '%' })).total).toBe(0);

        const apps = await readTable(c, 'team_applications');
        const resume = apps.rows[0]![apps.columns.findIndex((col) => col.name === 'resume')];
        expect(resume).toMatch(/^\d+ (B|KB|MB) file$/);
        const file = await readResume(c, apps.ids[0]!);
        expect(file!.resume.equals(fixture('resume.pdf'))).toBe(true);

        const csv = await tableCsv(c, 'waitlist');
        expect(csv.split('\r\n')[0]).toContain('name,email');
        expect(csv).toContain('kabir@gmail.com');
        await expect(readTable(c, 'nope"; drop table x; --')).rejects.toThrow('No such table');
      });
      expect(await asUser(stranger, (c) => readResume(c, randomUUID()))).toBeNull();
    });

    describe('managing admins', () => {
      // The parts of Supabase's auth schema that stepq.add_admin writes to.
      beforeAll(async () => {
        await query(`
          create schema if not exists extensions;
          create extension if not exists pgcrypto schema extensions;
          create schema if not exists auth;
          create table if not exists auth.users (
            instance_id uuid, id uuid primary key, aud text, role text, email text,
            encrypted_password text, email_confirmed_at timestamptz, raw_app_meta_data jsonb,
            raw_user_meta_data jsonb, created_at timestamptz, updated_at timestamptz,
            confirmation_token text, recovery_token text, email_change_token_new text,
            email_change text
          );
          create table if not exists auth.identities (
            id uuid primary key, user_id uuid, provider_id text, provider text,
            identity_data jsonb, last_sign_in_at timestamptz, created_at timestamptz,
            updated_at timestamptz
          );`);
      });
      beforeEach(() => query('truncate auth.users, auth.identities'));

      it('an admin creates a confirmed account for a new email, with a hashed password', async () => {
        expect(await asUser(admin, (c) => addAdmin(c, ' New.Admin@StepQ.in ', 'walk-more-8'))).toBe(
          'created',
        );
        const { rows } = await query<{ id: string; ok: boolean; confirmed: boolean }>(
          `select id, encrypted_password = extensions.crypt('walk-more-8', encrypted_password) as ok,
             email_confirmed_at is not null as confirmed
           from auth.users where email = 'new.admin@stepq.in'`,
        );
        expect(rows[0]).toMatchObject({ ok: true, confirmed: true });
        const ids = await query('select 1 from auth.identities where user_id = $1', [rows[0]!.id]);
        expect(ids.rows).toHaveLength(1);
        const added = await query('select added_by from stepq.admins where user_id = $1', [
          rows[0]!.id,
        ]);
        expect(added.rows[0]).toEqual({ added_by: admin.email });
        expect(await isAdmin({ id: rows[0]!.id, email: 'new.admin@stepq.in' })).toBe(true);
      });

      it('an existing account is promoted and keeps its password', async () => {
        await query(
          `insert into auth.users (id, email, encrypted_password) values ($1, $2, 'old-hash')`,
          [stranger.id, stranger.email],
        );
        expect(await asUser(admin, (c) => addAdmin(c, stranger.email, ''))).toBe('promoted');
        expect(await isAdmin(stranger)).toBe(true);
        const { rows } = await query('select encrypted_password from auth.users where id = $1', [
          stranger.id,
        ]);
        expect(rows[0]).toEqual({ encrypted_password: 'old-hash' });
        expect((await query('select 1 from auth.users')).rows).toHaveLength(1);
      });

      it('checks the email and password', async () => {
        await expect(
          asUser(admin, (c) => addAdmin(c, 'not-an-email', 'walk-more-8')),
        ).rejects.toThrow('Enter a valid email.');
        await expect(asUser(admin, (c) => addAdmin(c, 'a@b.in', 'short'))).rejects.toThrow(
          /at least 8 characters/,
        );
      });

      it('non-admins cannot add or remove admins', async () => {
        await expect(
          asUser(stranger, (c) => addAdmin(c, stranger.email, 'walk-more-8')),
        ).rejects.toThrow('Only admins can add admins.');
        await expect(asUser(stranger, (c) => removeAdmin(c, admin.id))).rejects.toThrow(
          'Only admins can remove admins.',
        );
        expect(await isAdmin(stranger)).toBe(false);
        expect(await isAdmin(admin)).toBe(true);
      });

      it('an admin removes another admin, but not themselves', async () => {
        await query('insert into stepq.admins (user_id, email) values ($1, $2)', [
          stranger.id,
          stranger.email,
        ]);
        await expect(asUser(admin, (c) => removeAdmin(c, admin.id))).rejects.toThrow(
          'You cannot remove yourself.',
        );
        await asUser(admin, (c) => removeAdmin(c, stranger.id));
        expect(await isAdmin(stranger)).toBe(false);
        expect(await isAdmin(admin)).toBe(true);
      });

      const newAdmin = async (email: string) => {
        await asUser(admin, (c) => addAdmin(c, email, 'walk-more-8'));
        const { rows } = await query<{ id: string }>('select id from auth.users where email = $1', [
          email,
        ]);
        return rows[0]!.id;
      };
      const passwordIs = async (id: string, pw: string) =>
        (
          await query<{ ok: boolean }>(
            'select encrypted_password = extensions.crypt($2, encrypted_password) as ok from auth.users where id = $1',
            [id, pw],
          )
        ).rows[0]!.ok;

      it('an admin edits a name, email and password; empty fields stay as they are', async () => {
        const id = await newAdmin('priya@stepq.in');
        const changed = randomUUID();
        await asUser(admin, (c) =>
          updateAdmin(c, id, {
            name: 'Priya',
            email: ' Priya.S@StepQ.in ',
            password: changed,
          }),
        );
        expect(await asUser(admin, (c) => readAdmin(c, id))).toEqual({
          userId: id,
          email: 'priya.s@stepq.in',
          name: 'Priya',
        });
        const { rows } = await query<{ email: string; meta: { full_name: string }; ident: string }>(
          `select u.email, u.raw_user_meta_data as meta, i.identity_data ->> 'email' as ident
           from auth.users u join auth.identities i on i.user_id = u.id where u.id = $1`,
          [id],
        );
        expect(rows[0]).toEqual({
          email: 'priya.s@stepq.in',
          meta: { full_name: 'Priya' },
          ident: 'priya.s@stepq.in',
        });
        expect(await passwordIs(id, changed)).toBe(true);

        await asUser(admin, (c) =>
          updateAdmin(c, id, { name: 'Priya S', email: '', password: '' }),
        );
        expect(await passwordIs(id, changed)).toBe(true);
        expect((await asUser(admin, (c) => readAdmin(c, id)))!.email).toBe('priya.s@stepq.in');
      });

      it('rejects a short password, a bad or taken email, and non-admins', async () => {
        const id = await newAdmin('priya@stepq.in');
        await newAdmin('kabir@stepq.in');
        await expect(
          asUser(admin, (c) => updateAdmin(c, id, { password: 'short' })),
        ).rejects.toThrow('at least 8 characters');
        await expect(asUser(admin, (c) => updateAdmin(c, id, { email: 'nope' }))).rejects.toThrow(
          'Enter a valid email.',
        );
        await expect(
          asUser(admin, (c) => updateAdmin(c, id, { email: 'KABIR@stepq.in' })),
        ).rejects.toThrow('Another account already uses that email.');
        await expect(
          asUser(stranger, (c) => updateAdmin(c, id, { password: 'hijacked-1' })),
        ).rejects.toThrow('Only admins can edit admins.');
        expect(await passwordIs(id, 'walk-more-8')).toBe(true);
      });

      it('an admin deletes another admin and their account, but not themselves', async () => {
        const id = await newAdmin('priya@stepq.in');
        await expect(asUser(admin, (c) => deleteAdmin(c, admin.id))).rejects.toThrow(
          'You cannot delete yourself.',
        );
        await expect(asUser(stranger, (c) => deleteAdmin(c, id))).rejects.toThrow(
          'Only admins can delete admins.',
        );
        await asUser(admin, (c) => deleteAdmin(c, id));
        expect(await isAdmin({ id, email: 'priya@stepq.in' })).toBe(false);
        expect((await query('select 1 from auth.users where id = $1', [id])).rows).toHaveLength(0);
        expect(
          (await query('select 1 from auth.identities where user_id = $1', [id])).rows,
        ).toHaveLength(0);
        expect(await isAdmin(admin)).toBe(true);
      });
    });
  });
});
