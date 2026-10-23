import { randomUUID } from 'node:crypto';
import type { CallableRequest } from 'firebase-functions/v2/https';
import { beforeEach, describe, expect, it } from 'vitest';
import { sendFounderMessageHandler } from '../src/handlers/founder';
import { db } from '../src/lib/admin';
import { setMailTransport } from '../src/lib/mail';

const host = process.env.FIRESTORE_EMULATOR_HOST;

const req = (data: unknown, ip = '5.5.5.5') =>
  ({ data, rawRequest: { headers: { 'x-forwarded-for': ip } } }) as unknown as CallableRequest;

const input = (over: Record<string, unknown> = {}) => ({
  name: 'Riya Sharma',
  email: 'riya@gmail.com',
  phone: '98765 43210',
  topic: 'partnership',
  message: 'We run a college in Pune.\nCan we talk?',
  website: '',
  requestId: randomUUID(),
  ...over,
});

const mails = async () =>
  (await db().collection('mail').where('template', '==', 'founderMessage').get()).docs.map((d) =>
    d.data(),
  );

describe.skipIf(!host)('founder message', () => {
  beforeEach(async () => {
    setMailTransport(undefined);
    await fetch(`http://${host}/emulator/v1/projects/demo-stepq/databases/(default)/documents`, {
      method: 'DELETE',
    });
  });

  it('stores the message and queues a mail replying to the sender', async () => {
    const data = input();
    expect(await sendFounderMessageHandler(req(data))).toEqual({ firstName: 'Riya' });
    expect((await db().doc(`founderMessages/${data.requestId}`).get()).data()).toMatchObject({
      name: 'Riya Sharma',
      email: 'riya@gmail.com',
      phone: '9876543210',
      topic: 'partnership',
      message: 'We run a college in Pune.\nCan we talk?',
    });
    const [mail, ...rest] = await mails();
    expect(rest).toHaveLength(0);
    expect(mail).toMatchObject({ replyTo: 'riya@gmail.com', subject: '' });
    expect(mail!.props).toMatchObject({
      topicLabel: 'Partnership',
      phone: '9876543210',
      message: 'We run a college in Pune.\nCan we talk?',
    });
  });

  it('maps each topic to its label', async () => {
    for (const [topic, label] of [
      ['investment', 'Investment'],
      ['feedback', 'Feedback'],
      ['press', 'Press'],
      ['other', 'Other'],
    ] as const) {
      await sendFounderMessageHandler(req(input({ topic }), `6.6.6.${label.length}`));
    }
    const labels = (await mails()).map((m) => m.props.topicLabel).sort();
    expect(labels).toEqual(['Feedback', 'Investment', 'Other', 'Press']);
  });

  it('accepts an empty phone and omits the key', async () => {
    const data = input({ phone: '' });
    await sendFounderMessageHandler(req(data));
    expect((await db().doc(`founderMessages/${data.requestId}`).get()).data()).not.toHaveProperty(
      'phone',
    );
    expect((await mails())[0]!.props).not.toHaveProperty('phone');
  });

  it('is idempotent on requestId', async () => {
    const data = input();
    await sendFounderMessageHandler(req(data));
    await sendFounderMessageHandler(req(data));
    expect((await db().collection('founderMessages').get()).size).toBe(1);
    expect(await mails()).toHaveLength(1);
  });

  it('rejects a filled honeypot and rate limits at 5 per window', async () => {
    await expect(sendFounderMessageHandler(req(input({ website: 'x' })))).rejects.toMatchObject({
      code: 'invalid-argument',
    });
    for (let i = 0; i < 5; i++) await sendFounderMessageHandler(req(input(), '8.1.1.1'));
    await expect(sendFounderMessageHandler(req(input(), '8.1.1.1'))).rejects.toMatchObject({
      code: 'resource-exhausted',
    });
  });
});
