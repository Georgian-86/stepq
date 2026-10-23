import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import { db } from './admin';

const uuid = z.string().uuid();

/**
 * Runs `fn` for (action, requestId); a repeat returns the stored result.
 * `fn` may run more than once if the transaction retries on contention, so
 * only its transactional writes are exactly-once. The result must be
 * JSON-serialisable and is returned identically on first and repeat calls.
 */
export async function once<T>(
  action: string,
  requestId: string,
  fn: (tx: Transaction) => Promise<T>,
): Promise<T> {
  if (!uuid.safeParse(requestId).success) {
    throw new HttpsError('invalid-argument', 'Invalid request id.');
  }
  const ref = db().doc(`requests/${action}:${requestId}`);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) return JSON.parse((snap.data() as { result: string }).result) as T;
    const result = JSON.stringify((await fn(tx)) ?? null);
    tx.set(ref, { result, createdAt: FieldValue.serverTimestamp() });
    return JSON.parse(result) as T;
  });
}
