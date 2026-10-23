import type { DocumentReference } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { REGION, RESEND_API_KEY } from '../config';
import { db } from '../lib/admin';
import { getMailTransport, renderMail } from '../lib/mail';

export const MAX_ATTEMPTS = 6;
export const MAX_AGE_MS = 24 * 3600_000;

/**
 * Delivers one queued mail doc. Throws on a retryable failure so Cloud
 * Functions retries; marks the doc failed (and returns) once it gives up.
 * Re-reads the doc each time because event snapshots are stale on retry.
 */
export async function processMail(ref: DocumentReference): Promise<void> {
  const snap = await ref.get();
  const mail = snap.data();
  if (!mail || mail.status !== 'queued') return;

  try {
    const transport = getMailTransport();
    if (transport) {
      const rendered = await renderMail(mail.template, mail.props ?? {});
      await transport({
        ...rendered,
        subject: mail.subject || rendered.subject,
        to: mail.to,
        ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
      });
    }
    await ref.update({ status: 'sent', sentAt: FieldValue.serverTimestamp() });
  } catch (err) {
    const attempts = (mail.attempts ?? 0) + 1;
    const lastError = err instanceof Error ? err.message : String(err);
    const createdMs: number =
      mail.createdAt?.toMillis?.() ?? snap.createTime?.toMillis() ?? Date.now();
    if (attempts >= MAX_ATTEMPTS || Date.now() - createdMs >= MAX_AGE_MS) {
      logger.error('mail delivery gave up', { mailId: ref.id, attempts, lastError });
      await ref.update({ status: 'failed', attempts, lastError });
      return;
    }
    await ref.update({ attempts, lastError });
    throw err;
  }
}

export const deliverMail = onDocumentCreated(
  { document: 'mail/{id}', region: REGION, retry: true, secrets: [RESEND_API_KEY] },
  async (event) => {
    await processMail(db().doc(`mail/${event.params.id}`));
  },
);
