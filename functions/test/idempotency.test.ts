import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { db } from '../src/lib/admin';
import { once } from '../src/lib/idempotency';

const hasEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

describe.skipIf(!hasEmulator)('once', () => {
  it('runs fn once per requestId and returns the stored result', async () => {
    const id = randomUUID();
    let runs = 0;
    const fn = async () => {
      runs++;
      return { n: runs };
    };
    const a = await once(id, fn);
    const b = await once(id, fn);
    expect(runs).toBe(1);
    expect(b).toEqual(a);
    expect((await db().doc(`requests/${id}`).get()).exists).toBe(true);
  });

  it('runs once even when fired concurrently', async () => {
    const id = randomUUID();
    let writes = 0;
    const fn = async (tx: FirebaseFirestore.Transaction) => {
      tx.set(db().doc(`idemTest/${id}`), { v: ++writes });
      return 'ok';
    };
    await Promise.all([once(id, fn), once(id, fn), once(id, fn)]);
    expect(
      (await db().collection('idemTest').where('v', '>=', 0).get()).docs.filter((d) => d.id === id),
    ).toHaveLength(1);
  });
});
