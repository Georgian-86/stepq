import { randomUUID } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { db } from '../src/lib/admin';
import { queueMail, setMailTransport, type OutgoingMail } from '../src/lib/mail';
import { processMail } from '../src/triggers/deliverMail';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

async function queue(extra: Record<string, unknown> = {}) {
  const ref = db().collection('mail').doc(randomUUID());
  await ref.set({
    to: 'riya@example.com',
    subject: 'Hi',
    template: 'welcome',
    props: { name: 'Riya' },
    status: 'queued',
    attempts: 0,
    createdAt: Timestamp.now(),
    ...extra,
  });
  return ref;
}

describe.skipIf(!hasEmulator)('deliverMail', () => {
  afterEach(() => setMailTransport(undefined));

  it('sends and marks sent', async () => {
    const sent: OutgoingMail[] = [];
    setMailTransport(async (m) => void sent.push(m));
    const ref = await queue({ replyTo: 'a@b.in' });
    await processMail(ref);
    const d = (await ref.get()).data()!;
    expect(d.status).toBe('sent');
    expect(d.sentAt).toBeTruthy();
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ to: 'riya@example.com', replyTo: 'a@b.in', subject: 'Hi' });
  });

  it('does not send twice if invoked again after sent', async () => {
    const send = vi.fn(async () => {});
    setMailTransport(send);
    const ref = await queue();
    await processMail(ref);
    await processMail(ref);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('throws on the first failure (retry), then succeeds: sent with attempts 1', async () => {
    const send = vi
      .fn<(m: OutgoingMail) => Promise<void>>()
      .mockRejectedValueOnce(new Error('resend down'));
    send.mockResolvedValue(undefined);
    setMailTransport(send);
    const ref = await queue();

    await expect(processMail(ref)).rejects.toThrow('resend down');
    let d = (await ref.get()).data()!;
    expect(d).toMatchObject({ status: 'queued', attempts: 1, lastError: 'resend down' });

    await processMail(ref);
    d = (await ref.get()).data()!;
    expect(d.status).toBe('sent');
    expect(d.attempts).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('gives up after 6 attempts: status failed and no rethrow', async () => {
    setMailTransport(async () => {
      throw new Error('always down');
    });
    const ref = await queue();
    for (let i = 1; i <= 5; i++) {
      await expect(processMail(ref)).rejects.toThrow('always down');
      expect((await ref.get()).data()).toMatchObject({ status: 'queued', attempts: i });
    }
    await expect(processMail(ref)).resolves.toBeUndefined();
    expect((await ref.get()).data()).toMatchObject({
      status: 'failed',
      attempts: 6,
      lastError: 'always down',
    });
  });

  it('gives up when older than 24 h', async () => {
    setMailTransport(async () => {
      throw new Error('down');
    });
    const ref = await queue({ createdAt: Timestamp.fromMillis(Date.now() - 25 * 3600_000) });
    await expect(processMail(ref)).resolves.toBeUndefined();
    expect((await ref.get()).data()).toMatchObject({ status: 'failed', attempts: 1 });
  });

  it('queueMail(null) writes a queued doc and resolves after the write', async () => {
    await queueMail(null, { to: 'null@b.in', subject: 's', template: 'welcome', props: {} });
    const snap = await db().collection('mail').where('to', '==', 'null@b.in').limit(1).get();
    expect(snap.docs[0]!.data()).toMatchObject({ status: 'queued', attempts: 0 });
  });

  it('queueMail writes a queued doc inside a transaction', async () => {
    const id = await db().runTransaction(async (tx) => {
      queueMail(tx, { to: 'a@b.in', subject: 's', template: 'welcome', props: { x: 1 } });
      return 'tx';
    });
    expect(id).toBe('tx');
    const snap = await db().collection('mail').where('to', '==', 'a@b.in').limit(1).get();
    expect(snap.docs[0]!.data()).toMatchObject({ status: 'queued', attempts: 0 });
  });
});
