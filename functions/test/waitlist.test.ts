import { randomUUID } from 'node:crypto';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkUsernameHandler,
  joinWaitlistHandler,
  reserveUsernameHandler,
} from '../src/handlers/waitlist';
import { db } from '../src/lib/admin';
import { setMailTransport } from '../src/lib/mail';
import { signToken } from '../src/lib/signedToken';

const host = process.env.FIRESTORE_EMULATOR_HOST;
const hasEmulator = Boolean(host);

const req = (data: unknown, ip = '1.1.1.1') =>
  ({ data, rawRequest: { headers: { 'x-forwarded-for': ip } } }) as unknown as CallableRequest;

const joinData = (over: Record<string, unknown> = {}) => ({
  name: 'Riya Sharma',
  email: 'riya@gmail.com',
  gender: 'female',
  ageGroup: '25_34',
  country: 'India',
  website: '',
  requestId: randomUUID(),
  ...over,
});

const reserveToken = (id: string, exp = Date.now() + 60_000) =>
  signToken({ k: 'reserve', id, exp });

async function newEntry(email: string) {
  const r = await joinWaitlistHandler(req(joinData({ email })));
  return r.reserveToken as string;
}
const idOf = async (email: string) =>
  ((await db().doc(`waitlistEmails/${email}`).get()).data() as { id: string }).id;

describe.skipIf(!hasEmulator)('waitlist callables', () => {
  beforeEach(async () => {
    setMailTransport(undefined);
    await fetch(`http://${host}/emulator/v1/projects/demo-stepq/databases/(default)/documents`, {
      method: 'DELETE',
    });
  });

  it('joins with sequential positions and a live count', async () => {
    const a = await joinWaitlistHandler(req(joinData()));
    expect(a).toMatchObject({ status: 'joined', position: 1, email: 'riya@gmail.com' });
    expect(a.reserveToken).toBeTruthy();
    expect((await db().doc('public/stats').get()).data()?.waitlistCount).toBe(1);
    const b = await joinWaitlistHandler(req(joinData({ email: 'sam@gmail.com' })));
    expect(b).toMatchObject({ status: 'joined', position: 2 });
    expect((await db().doc('public/stats').get()).data()?.waitlistCount).toBe(2);
  });

  it('treats a differently-cased/spaced email as existing and mails the reserve link once', async () => {
    await joinWaitlistHandler(req(joinData()));
    const again = await joinWaitlistHandler(req(joinData({ email: ' Riya@Gmail.com ' })));
    expect(again).toEqual({ status: 'existing', position: 1, email: 'riya@gmail.com' });
    expect(again).not.toHaveProperty('reserveToken');
    expect((await db().doc('public/stats').get()).data()?.waitlistCount).toBe(1);
    const mails = await db().collection('mail').get();
    expect(mails.size).toBe(1);
    const mail = mails.docs[0]!.data();
    expect(mail).toMatchObject({ template: 'reserveLink', to: 'riya@gmail.com', status: 'queued' });
    expect(mail.props.reserveUrl).toContain('/?modal=reserve&token=');
    expect(mail.props).toMatchObject({ firstName: 'Riya', position: 1 });
  });

  it('does not mail a reserve link when the entry already has a username', async () => {
    const token = await newEntry('riya@gmail.com');
    await reserveUsernameHandler(req({ username: 'riya.walks', reserveToken: token }));
    const again = await joinWaitlistHandler(req(joinData()));
    expect(again.status).toBe('existing');
    expect((await db().collection('mail').get()).size).toBe(0);
  });

  it('is idempotent on requestId', async () => {
    const data = joinData();
    const a = await joinWaitlistHandler(req(data));
    const b = await joinWaitlistHandler(req(data));
    expect(b).toEqual(a);
    expect((await db().collection('waitlist').get()).size).toBe(1);
    expect((await db().doc('public/stats').get()).data()?.waitlistCount).toBe(1);
  });

  it('rejects a filled honeypot with field details', async () => {
    await expect(joinWaitlistHandler(req(joinData({ website: 'x' })))).rejects.toMatchObject({
      code: 'invalid-argument',
      details: { fields: expect.any(Object) },
    });
    expect((await db().collection('waitlist').get()).size).toBe(0);
  });

  it('succeeds while the mail transport is failing (mail is only queued)', async () => {
    setMailTransport(async () => {
      throw new Error('resend down');
    });
    await joinWaitlistHandler(req(joinData()));
    const again = await joinWaitlistHandler(req(joinData()));
    expect(again.status).toBe('existing');
    const mails = await db().collection('mail').get();
    expect(mails.size).toBe(1);
    expect(mails.docs[0]!.data()).toMatchObject({ status: 'queued', attempts: 0 });
  });

  it('rate limits joins at 10 per window', async () => {
    for (let i = 0; i < 10; i++) {
      await joinWaitlistHandler(req(joinData({ email: `p${i}@gmail.com` }), '7.7.7.7'));
    }
    await expect(
      joinWaitlistHandler(req(joinData({ email: 'p11@gmail.com' }), '7.7.7.7')),
    ).rejects.toMatchObject({ code: 'resource-exhausted' });
  });

  it('checkUsername reports invalid, reserved, taken and available', async () => {
    expect(await checkUsernameHandler(req({ username: '@StepQ' }))).toEqual({
      available: false,
      reason: 'reserved',
    });
    expect(await checkUsernameHandler(req({ username: 'a' }))).toEqual({
      available: false,
      reason: 'invalid',
    });
    expect(await checkUsernameHandler(req({ username: 'riya.walks' }))).toEqual({
      available: true,
    });
    const token = await newEntry('riya@gmail.com');
    await reserveUsernameHandler(req({ username: 'riya.walks', reserveToken: token }));
    expect(await checkUsernameHandler(req({ username: '@Riya.Walks' }))).toEqual({
      available: false,
      reason: 'taken',
    });
  });

  it('reserveUsername sets the username on both docs', async () => {
    const token = await newEntry('riya@gmail.com');
    const out = await reserveUsernameHandler(req({ username: '@Riya.Walks', reserveToken: token }));
    expect(out).toEqual({ username: 'riya.walks' });
    const id = await idOf('riya@gmail.com');
    expect((await db().doc(`waitlist/${id}`).get()).data()?.username).toBe('riya.walks');
    expect((await db().doc('usernames/riya.walks').get()).data()?.waitlistId).toBe(id);
    await expect(
      reserveUsernameHandler(req({ username: 'another.one', reserveToken: token })),
    ).rejects.toMatchObject({
      code: 'failed-precondition',
      message: 'You already reserved @riya.walks',
    });
  });

  it('two concurrent reserves of one name: exactly one wins, the other sees Taken', async () => {
    await newEntry('riya@gmail.com');
    await newEntry('sam@gmail.com');
    const tokens = [
      reserveToken(await idOf('riya@gmail.com')),
      reserveToken(await idOf('sam@gmail.com')),
    ];
    const results = await Promise.allSettled(
      tokens.map((t) => reserveUsernameHandler(req({ username: 'riya.walks', reserveToken: t }))),
    );
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({
      code: 'already-exists',
      details: { fields: { username: 'Taken. Try another.' } },
    });
  });

  it('rejects an expired or malformed reserve token', async () => {
    await newEntry('riya@gmail.com');
    const expired = reserveToken(await idOf('riya@gmail.com'), Date.now() - 1000);
    await expect(
      reserveUsernameHandler(req({ username: 'riya.walks', reserveToken: expired })),
    ).rejects.toMatchObject({ code: 'permission-denied' });
    await expect(
      reserveUsernameHandler(req({ username: 'riya.walks', reserveToken: 'junk' })),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });
});
