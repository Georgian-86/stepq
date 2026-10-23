import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/** Emulator access for e2e tests (run inside `firebase emulators:exec`, see `pnpm e2e`). */
export const PROJECT_ID = 'demo-stepq';
const FIRESTORE_HOST = (process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080');

function db() {
  const app = getApps()[0] ?? initializeApp({ projectId: PROJECT_ID });
  return getFirestore(app);
}

/** Deletes every Firestore document in the emulator (waitlist, mail, rate limits…). */
export async function resetEmulators(): Promise<void> {
  const res = await fetch(
    `http://${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`Firestore emulator reset failed: ${res.status}`);
}

export interface MailDoc {
  id: string;
  to: string;
  template: string;
  subject: string;
  props: Record<string, unknown>;
  status: 'queued' | 'sent' | 'failed' | string;
  replyTo?: string;
}

/** Mail docs queued by the Functions (MAIL_TRANSPORT=outbox), optionally filtered. */
export async function readMail(
  filter: Partial<Pick<MailDoc, 'to' | 'template' | 'status'>> = {},
): Promise<MailDoc[]> {
  const snap = await db().collection('mail').get();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }) as MailDoc)
    .filter((m) =>
      Object.entries(filter).every(([k, v]) => v === undefined || m[k as keyof MailDoc] === v),
    );
}

/** One Firestore document's data, or null when it does not exist. */
export async function readDoc<T = Record<string, unknown>>(path: string): Promise<T | null> {
  const snap = await db().doc(path).get();
  return snap.exists ? (snap.data() as T) : null;
}

/** Every document in a top-level collection, with its id. */
export async function readCollection<T = Record<string, unknown>>(
  name: string,
): Promise<(T & { id: string })[]> {
  const snap = await db().collection(name).get();
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}

/** Writes (merges) one Firestore document, e.g. to seed `public/stats`. */
export async function writeDoc(path: string, data: Record<string, unknown>): Promise<void> {
  await db().doc(path).set(data, { merge: true });
}

/** The signed `token` from a mail's action link (reserveUrl / approveUrl / verifyUrl). */
export function actionTokenFromMail(mail: MailDoc): string {
  for (const key of ['reserveUrl', 'approveUrl', 'verifyUrl']) {
    const url = mail.props[key];
    if (typeof url !== 'string') continue;
    const token = new URL(url).searchParams.get('token');
    if (token) return token;
  }
  throw new Error(`No action token in mail ${mail.id} (${mail.template})`);
}
