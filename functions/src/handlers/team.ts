import { firstName } from '@stepq/core';
import { RESUME_MAX_BYTES, ROLE_LABELS, teamApplicationInput, type Api } from '@stepq/schemas';
import { FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { FOUNDER_INBOX } from '../config';
import { bucket, db } from '../lib/admin';
import { callOptions } from '../lib/appCheck';
import { once } from '../lib/idempotency';
import { queueMail } from '../lib/mail';
import { enforceRateLimit } from '../lib/rateLimit';
import { parseOrThrow } from '../lib/validate';

type Req = Pick<CallableRequest, 'data' | 'rawRequest'>;

const RESUME_ERROR = 'Upload a PDF up to 5 MB';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function resumeError(): HttpsError {
  return new HttpsError('invalid-argument', 'Check the highlighted fields', {
    fields: { resume: RESUME_ERROR },
  });
}

/** Schema errors on resume.* surface under the single `resume` field the form shows. */
function parseResumeFields(data: unknown) {
  try {
    return parseOrThrow(teamApplicationInput, data);
  } catch (e) {
    if (e instanceof HttpsError && e.details) {
      const fields = (e.details as { fields: Record<string, string> }).fields;
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(fields))
        out[k.startsWith('resume.') ? 'resume' : k] ??= v;
      throw new HttpsError(e.code, e.message, { fields: out });
    }
    throw e;
  }
}

/** Decodes strict base64 and checks it is a non-empty PDF within the size limit. */
function decodeResume(b64: string): Buffer {
  const bytes = Buffer.from(b64, 'base64');
  const stripped = b64.replace(/=+$/, '');
  if (bytes.toString('base64').replace(/=+$/, '') !== stripped) throw resumeError();
  if (bytes.length === 0 || bytes.length > RESUME_MAX_BYTES) throw resumeError();
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw resumeError();
  return bytes;
}

/** Emulator: public emulator download URL. Production: v4 signed read URL valid 7 days. */
export async function resumeUrlFor(path: string): Promise<string> {
  const b = bucket();
  const emulator = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? process.env.STORAGE_EMULATOR_HOST;
  if (emulator) {
    const host = emulator.replace(/^https?:\/\//, '');
    return `http://${host}/v0/b/${b.name}/o/${encodeURIComponent(path)}?alt=media`;
  }
  const [url] = await b.file(path).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + WEEK_MS,
  });
  return url;
}

export async function submitTeamApplicationHandler(
  req: Req,
): Promise<Api['submitTeamApplication']['out']> {
  const input = parseResumeFields(req.data);
  const bytes = decodeResume(input.resume.base64);
  await enforceRateLimit(req, 'team', 5, 600);

  const id = input.requestId;
  const path = `resumes/${id}.pdf`;
  // Idempotent path: a retried requestId re-uploads the same bytes harmlessly.
  await bucket().file(path).save(bytes, { contentType: 'application/pdf', resumable: false });
  const resumeUrl = await resumeUrlFor(path);

  return once('team', input.requestId, async (tx) => {
    tx.set(db().doc(`teamApplications/${id}`), {
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role,
      ...(input.link ? { link: input.link } : {}),
      why: input.why,
      resumePath: path,
      resumeName: input.resume.fileName,
      createdAt: FieldValue.serverTimestamp(),
    });
    queueMail(tx, {
      to: FOUNDER_INBOX.value(),
      subject: '',
      template: 'teamApplicationAlert',
      props: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        roleLabel: ROLE_LABELS[input.role],
        ...(input.link ? { link: input.link } : {}),
        why: input.why,
        resumeUrl,
      },
      replyTo: input.email,
    });
    return { firstName: firstName(input.name) };
  });
}

export const submitTeamApplication = onCall(callOptions, submitTeamApplicationHandler);
