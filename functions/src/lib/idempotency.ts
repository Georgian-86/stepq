import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { db } from './admin';

/** Runs `fn` at most once per requestId; repeats return the stored result. */
export function once<T>(requestId: string, fn: (tx: Transaction) => Promise<T>): Promise<T> {
  const ref = db().doc(`requests/${requestId}`);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return (snap.data() as { result: T }).result;
    const result = await fn(tx);
    tx.set(ref, { result: result ?? null, createdAt: FieldValue.serverTimestamp() });
    return result;
  });
}
