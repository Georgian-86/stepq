import { firstName } from '@stepq/core';
import { ambassadorInput, type Api } from '@stepq/schemas';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { FOUNDER_INBOX, SITE_URL } from '../config';
import { db } from '../lib/admin';
import { callOptions } from '../lib/appCheck';
import { once } from '../lib/idempotency';
import { queueMail } from '../lib/mail';
import { enforceRateLimit } from '../lib/rateLimit';
import { signToken } from '../lib/signedToken';
import { parseOrThrow } from '../lib/validate';

type Req = Pick<CallableRequest, 'data' | 'rawRequest'>;

const APPROVE_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function submitAmbassadorHandler(req: Req): Promise<Api['submitAmbassador']['out']> {
  const input = parseOrThrow(ambassadorInput, req.data);
  await enforceRateLimit(req, 'ambassador', 5, 600);

  const id = input.requestId;
  return once('ambassador', id, async (tx) => {
    tx.set(db().doc(`ambassadorApplications/${id}`), {
      name: input.name,
      email: input.email,
      phone: input.phone,
      city: input.city,
      instagram: input.instagram,
      followers: input.followers,
      collegeOrCompany: input.collegeOrCompany,
      plan: input.plan,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });
    const token = signToken({ k: 'approveAmbassador', id, exp: Date.now() + APPROVE_LINK_TTL_MS });
    queueMail(tx, {
      to: FOUNDER_INBOX.value(),
      subject: '',
      template: 'ambassadorAlert',
      // The alert template shares the team-application shape: the role line carries the
      // city and the "resume" link is the applicant's Instagram profile.
      props: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        roleLabel: `Ambassador (${input.city})`,
        link: `https://instagram.com/${input.instagram}`,
        why: input.plan,
        resumeUrl: `https://instagram.com/${input.instagram}`,
        approveUrl: `${SITE_URL.value()}/confirm?token=${token}`,
      },
      replyTo: input.email,
    });
    return { firstName: firstName(input.name) };
  });
}

export const submitAmbassador = onCall(callOptions, submitAmbassadorHandler);
