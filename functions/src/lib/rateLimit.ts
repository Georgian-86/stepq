import { createHash } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { db } from './admin';
import { clientIp } from './ip';

export async function enforceRateLimit(
  req: Pick<CallableRequest, 'rawRequest'>,
  action: string,
  limit: number,
  windowSec: number,
): Promise<void> {
  const key = createHash('sha256')
    .update(clientIp(req) + action)
    .digest('hex');
  const ref = db().doc(`rateLimits/${key}`);
  await db().runTransaction(async (tx) => {
    const now = Date.now();
    const snap = await tx.get(ref);
    const data = snap.data() as { count: number; resetAt: Timestamp } | undefined;
    if (!data || data.resetAt.toMillis() <= now) {
      const resetAt = Timestamp.fromMillis(now + windowSec * 1000);
      tx.set(ref, { count: 1, resetAt, action });
      return;
    }
    if (data.count >= limit) {
      throw new HttpsError('resource-exhausted', 'Too many tries. Please wait a few minutes.');
    }
    tx.update(ref, { count: data.count + 1 });
  });
}
