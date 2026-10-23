import { randomUUID } from 'node:crypto';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { beforeEach, describe, expect, it } from 'vitest';
import { confirmActionHandler, describeActionHandler } from '../src/handlers/actions';
import { submitAmbassadorHandler } from '../src/handlers/ambassador';
import { db } from '../src/lib/admin';
import { setMailTransport } from '../src/lib/mail';
import { signToken } from '../src/lib/signedToken';

const host = process.env.FIRESTORE_EMULATOR_HOST;
const hasEmulator = Boolean(host);

const req = (data: unknown, ip = '3.3.3.3') =>
  ({ data, rawRequest: { headers: { 'x-forwarded-for': ip } } }) as unknown as CallableRequest;

const input = (over: Record<string, unknown> = {}) => ({
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

async function apply(over: Record<string, unknown> = {}) {
  const data = input(over);
  await submitAmbassadorHandler(req(data));
  const alert = (
    await db().collection('mail').where('template', '==', 'ambassadorAlert').get()
  ).docs[0]!.data();
  const token = (alert.props.approveUrl as string).split('/confirm?token=')[1]!;
  return { data, token, alert };
}

const mailsOf = async (template: string) =>
  (await db().collection('mail').where('template', '==', template).get()).docs.map((d) => d.data());

describe.skipIf(!hasEmulator)('ambassador applications and action confirm', () => {
  beforeEach(async () => {
    setMailTransport(undefined);
    await fetch(`http://${host}/emulator/v1/projects/demo-stepq/databases/(default)/documents`, {
      method: 'DELETE',
    });
  });

  it('submit stores a pending application and queues one alert with an approve link', async () => {
    const data = input();
    const out = await submitAmbassadorHandler(req(data));
    expect(out).toEqual({ firstName: 'Riya' });
    const snap = await db().doc(`ambassadorApplications/${data.requestId}`).get();
    expect(snap.data()).toMatchObject({
      status: 'pending',
      name: 'Riya Sharma',
      city: 'Mumbai',
      instagram: 'riya.walks',
      phone: '+919876543210',
    });
    const alerts = await mailsOf('ambassadorAlert');
    expect(alerts).toHaveLength(1);
    expect(alerts[0]!.props.approveUrl).toContain('/confirm?token=');
    expect(alerts[0]!.replyTo).toBe('riya@gmail.com');
  });

  it('submit is idempotent on requestId', async () => {
    const data = input();
    await submitAmbassadorHandler(req(data));
    await submitAmbassadorHandler(req(data));
    expect((await db().collection('ambassadorApplications').get()).size).toBe(1);
    expect(await mailsOf('ambassadorAlert')).toHaveLength(1);
  });

  it('submit rejects a filled honeypot and rate limits at 5 per window', async () => {
    await expect(submitAmbassadorHandler(req(input({ website: 'x' })))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    for (let i = 0; i < 5; i++) await submitAmbassadorHandler(req(input(), '8.8.8.8'));
    await expect(submitAmbassadorHandler(req(input(), '8.8.8.8'))).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
  });

  it('describe returns the approve summary with done:false', async () => {
    const { token } = await apply();
    expect(await describeActionHandler(req({ token }))).toEqual({
      kind: 'approveAmbassador',
      summary: 'Approve Riya Sharma (Mumbai) as an ambassador?',
      done: false,
    });
  });

  it('confirm approves and queues exactly one ambassadorApproved mail; again is a no-op', async () => {
    const { data, token } = await apply();
    expect(await confirmActionHandler(req({ token }))).toEqual({ done: true });
    const app = (await db().doc(`ambassadorApplications/${data.requestId}`).get()).data()!;
    expect(app.status).toBe('approved');
    expect(app.approvedAt).toBeTruthy();
    let approved = await mailsOf('ambassadorApproved');
    expect(approved).toHaveLength(1);
    expect(approved[0]).toMatchObject({ to: 'riya@gmail.com' });
    expect(approved[0]!.props).toMatchObject({ firstName: 'Riya', city: 'Mumbai' });
    expect(approved[0]!.props.kitUrl).toBeUndefined();

    expect(await confirmActionHandler(req({ token }))).toEqual({ done: true });
    approved = await mailsOf('ambassadorApproved');
    expect(approved).toHaveLength(1);
    expect((await describeActionHandler(req({ token }))).done).toBe(true);
  });

  it('concurrent confirms send one mail', async () => {
    const { token } = await apply();
    await Promise.all([confirmActionHandler(req({ token })), confirmActionHandler(req({ token }))]);
    expect(await mailsOf('ambassadorApproved')).toHaveLength(1);
  });

  it('rejects reserve tokens, junk, expired tokens and unknown applications', async () => {
    const reserve = signToken({ k: 'reserve', id: 'x', exp: Date.now() + 60_000 });
    for (const token of [reserve, 'junk']) {
      await expect(describeActionHandler(req({ token }))).rejects.toMatchObject({
        code: 'permission-denied',
      });
      await expect(confirmActionHandler(req({ token }))).rejects.toMatchObject({
        code: 'permission-denied',
      });
    }
    const expired = signToken({ k: 'approveAmbassador', id: 'x', exp: Date.now() - 1 });
    await expect(confirmActionHandler(req({ token: expired }))).rejects.toMatchObject({
      code: 'permission-denied',
    });
    const missing = signToken({ k: 'approveAmbassador', id: 'nope', exp: Date.now() + 60_000 });
    await expect(describeActionHandler(req({ token: missing }))).rejects.toMatchObject({
      code: 'not-found',
    });
    await expect(confirmActionHandler(req({ token: missing }))).rejects.toMatchObject({
      code: 'not-found',
    });
  });

  it('rate limits describe at 60 and confirm at 20 per window', async () => {
    const { token } = await apply();
    for (let i = 0; i < 20; i++) await confirmActionHandler(req({ token }, '9.9.9.9'));
    await expect(confirmActionHandler(req({ token }, '9.9.9.9'))).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
    for (let i = 0; i < 60; i++) await describeActionHandler(req({ token }, '9.9.9.9'));
    await expect(describeActionHandler(req({ token }, '9.9.9.9'))).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
  });
});
