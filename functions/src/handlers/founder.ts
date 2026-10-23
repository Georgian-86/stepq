import { firstName } from '@stepq/core';
import { founderMessageInput, type Api, type FounderMessageInput } from '@stepq/schemas';
import { FieldValue } from 'firebase-admin/firestore';
import { onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { FOUNDER_INBOX } from '../config';
import { db } from '../lib/admin';
import { callOptions } from '../lib/appCheck';
import { once } from '../lib/idempotency';
import { queueMail } from '../lib/mail';
import { enforceRateLimit } from '../lib/rateLimit';
import { parseOrThrow } from '../lib/validate';

type Req = Pick<CallableRequest, 'data' | 'rawRequest'>;

const TOPIC_LABELS: Record<FounderMessageInput['topic'], string> = {
  partnership: 'Partnership',
  investment: 'Investment',
  feedback: 'Feedback',
  press: 'Press',
  other: 'Other',
};

export async function sendFounderMessageHandler(
  req: Req,
): Promise<Api['sendFounderMessage']['out']> {
  const input = parseOrThrow(founderMessageInput, req.data);
  await enforceRateLimit(req, 'founder', 5, 600);

  const id = input.requestId;
  return once('founder', id, async (tx) => {
    const phone = input.phone ? { phone: input.phone } : {};
    tx.create(db().doc(`founderMessages/${id}`), {
      name: input.name,
      email: input.email,
      ...phone,
      topic: input.topic,
      message: input.message,
      createdAt: FieldValue.serverTimestamp(),
    });
    queueMail(tx, {
      to: FOUNDER_INBOX.value(),
      subject: '',
      template: 'founderMessage',
      props: {
        name: input.name,
        email: input.email,
        ...phone,
        topicLabel: TOPIC_LABELS[input.topic],
        message: input.message,
      },
      replyTo: input.email,
    });
    return { firstName: firstName(input.name) };
  });
}

export const sendFounderMessage = onCall(callOptions, sendFounderMessageHandler);
