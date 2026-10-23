import { buildUpiLink, newReference } from '@stepq/core';
import { backingInput, type Api } from '@stepq/schemas';
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

const VERIFY_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const istFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  dateStyle: 'medium',
  timeStyle: 'short',
});

export async function recordBackingHandler(req: Req): Promise<Api['recordBacking']['out']> {
  const input = parseOrThrow(backingInput, req.data);
  await enforceRateLimit(req, 'backing', 10, 600);

  const id = input.requestId;
  return once('backing', id, async (tx) => {
    const reference = newReference();
    tx.create(db().doc(`backings/${id}`), {
      name: input.name,
      phone: input.phone,
      amount: input.amount,
      showOnWall: input.showOnWall,
      reference,
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    });
    const token = signToken({ k: 'verifyBacking', id, exp: Date.now() + VERIFY_LINK_TTL_MS });
    queueMail(tx, {
      to: FOUNDER_INBOX.value(),
      subject: '',
      template: 'backingAlert',
      props: {
        name: input.name,
        phone: input.phone,
        amount: input.amount,
        reference,
        createdAtIst: istFormat.format(new Date()),
        showOnWall: input.showOnWall,
        verifyUrl: `${SITE_URL.value()}/confirm?token=${token}`,
      },
    });
    return {
      reference,
      amount: input.amount,
      upiLink: buildUpiLink({ amount: input.amount, note: `StepQ ${reference}` }),
    };
  });
}

export const recordBacking = onCall(callOptions, recordBackingHandler);
