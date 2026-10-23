import { randomUUID } from 'node:crypto';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { beforeEach, describe, expect, it } from 'vitest';
import { confirmActionHandler, describeActionHandler } from '../src/handlers/actions';
import { recordBackingHandler } from '../src/handlers/backing';
import { db } from '../src/lib/admin';
import { setMailTransport } from '../src/lib/mail';

const host = process.env.FIRESTORE_EMULATOR_HOST;

const req = (data: unknown, ip = '4.4.4.4') =>
  ({ data, rawRequest: { headers: { 'x-forwarded-for': ip } } }) as unknown as CallableRequest;

const input = (over: Record<string, unknown> = {}) => ({
  name: 'Riya Sharma',
  phone: '9876543210',
  amount: 501,
  showOnWall: true,
  website: '',
  requestId: randomUUID(),
  ...over,
});

const mailsOf = async (template: string) =>
  (await db().collection('mail').where('template', '==', template).get()).docs.map((d) => d.data());

async function back(over: Record<string, unknown> = {}) {
  const data = input(over);
  const out = await recordBackingHandler(req(data));
  const alert = (await mailsOf('backingAlert')).find((m) => m.props.reference === out.reference)!;
  const token = (alert.props.verifyUrl as string).split('/confirm?token=')[1]!;
  return { data, out, alert, token };
}

const names = async () =>
  ((await db().doc('public/backers').get()).data()?.names as string[] | undefined) ?? [];

describe.skipIf(!host)('backing and verify', () => {
  beforeEach(async () => {
    setMailTransport(undefined);
    await fetch(`http://${host}/emulator/v1/projects/demo-stepq/databases/(default)/documents`, {
      method: 'DELETE',
    });
  });

  it('records a pending backing, queues the alert and returns the UPI link', async () => {
    const { data, out, alert } = await back();
    expect(out.amount).toBe(501);
    expect(out.reference).toMatch(/^[A-Z0-9]{6}$/);
    expect(out.upiLink.endsWith(`&am=501.00&cu=INR&tn=StepQ%20${out.reference}`)).toBe(true);
    const snap = (await db().doc(`backings/${data.requestId}`).get()).data()!;
    expect(snap).toMatchObject({
      status: 'pending',
      reference: out.reference,
      phone: '+919876543210',
      showOnWall: true,
    });
    expect(alert.props).toMatchObject({
      name: 'Riya Sharma',
      amount: 501,
      reference: out.reference,
      showOnWall: true,
    });
    expect(alert.props.createdAtIst).toEqual(expect.any(String));
    expect(alert.props.verifyUrl).toContain('/confirm?token=');
  });

  it('is idempotent on requestId and returns the same reference', async () => {
    const data = input();
    const a = await recordBackingHandler(req(data));
    const b = await recordBackingHandler(req(data));
    expect(b).toEqual(a);
    expect((await db().collection('backings').get()).size).toBe(1);
    expect(await mailsOf('backingAlert')).toHaveLength(1);
  });

  it('rate limits at 10 per window', async () => {
    for (let i = 0; i < 10; i++) await recordBackingHandler(req(input(), '7.7.7.7'));
    await expect(recordBackingHandler(req(input(), '7.7.7.7'))).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
  });

  it('describes the backing', async () => {
    const { out, token } = await back({ amount: 1001 });
    expect(await describeActionHandler(req({ token }))).toEqual({
      kind: 'verifyBacking',
      summary: `Verify ₹1,001 from Riya S. (ref ${out.reference})?`,
      done: false,
    });
  });

  it('verify flips status and lists the wall name once, even when repeated or concurrent', async () => {
    const { data, token } = await back();
    await Promise.all([confirmActionHandler(req({ token })), confirmActionHandler(req({ token }))]);
    await confirmActionHandler(req({ token }));
    const b = (await db().doc(`backings/${data.requestId}`).get()).data()!;
    expect(b.status).toBe('verified');
    expect(b.verifiedAt).toBeTruthy();
    expect(await names()).toEqual(['Riya S.']);
    expect((await db().doc('public/backers').get()).data()!.updatedAt).toBeTruthy();
    expect((await describeActionHandler(req({ token }))).done).toBe(true);
    expect(await mailsOf('backerThanks')).toHaveLength(0);
  });

  it('appends to an existing list and keeps two different backers with the same wall name', async () => {
    await db()
      .doc('public/backers')
      .set({ names: ['Aman K.'] });
    const a = await back();
    const b = await back();
    await confirmActionHandler(req({ token: a.token }));
    await confirmActionHandler(req({ token: b.token }));
    expect(await names()).toEqual(['Aman K.', 'Riya S.', 'Riya S.']);
  });

  it('does not list backers who opted out', async () => {
    const { token, data } = await back({ showOnWall: false });
    await confirmActionHandler(req({ token }));
    expect((await db().doc(`backings/${data.requestId}`).get()).data()!.status).toBe('verified');
    expect(await names()).toEqual([]);
  });
});
