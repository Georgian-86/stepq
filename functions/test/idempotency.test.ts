import { randomUUID } from 'node:crypto';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { describe, expect, it } from 'vitest';
import { db } from '../src/lib/admin';
import { once } from '../src/lib/idempotency';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hasEmulator)('once', () => {
  it('runs fn once per (action, requestId) and returns the same result', async () => {
    const id = randomUUID();
    let runs = 0;
    const fn = async () => ({ n: ++runs });
    const a = await once('join', id, fn);
    const b = await once('join', id, fn);
    expect(runs).toBe(1);
    expect(b).toEqual(a);
    expect((await db().doc(`requests/join:${id}`).get()).exists).toBe(true);
  });

  it('namespaces by action', async () => {
    const id = randomUUID();
    expect(await once('a', id, async () => 1)).toBe(1);
    expect(await once('b', id, async () => 2)).toBe(2);
  });

  it('returns null for undefined results, on first and repeat', async () => {
    const id = randomUUID();
    expect(await once('x', id, async () => undefined)).toBeNull();
    expect(await once('x', id, async () => undefined)).toBeNull();
  });

  it('rejects a non-uuid requestId', async () => {
    await expect(once('x', 'a/b', async () => 1)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('applies its transactional write exactly once under concurrency', async () => {
    const id = randomUUID();
    const counter = db().doc(`idemTest/${id}`);
    const fn = async (tx: Transaction) => {
      tx.set(counter, { n: FieldValue.increment(1) }, { merge: true });
      return 'ok';
    };
    const results = await Promise.all([1, 2, 3, 4].map(() => once('c', id, fn)));
    expect(new Set(results)).toEqual(new Set(['ok']));
    expect((await counter.get()).data()).toEqual({ n: 1 });
  });
});
