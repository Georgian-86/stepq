import { firstName } from '@stepq/core';
import { founderMessageInput, TOPIC_LABELS, type Api } from '@stepq/schemas';
import { env } from '../env';
import { queueMail } from '../mail';
import { once } from '../once';
import { enforceRateLimit } from '../rateLimit';
import type { Ctx } from '../types';
import { parseOrThrow } from '../validate';

export async function sendFounderMessage(
  data: unknown,
  ctx: Ctx,
): Promise<Api['sendFounderMessage']['out']> {
  const input = parseOrThrow(founderMessageInput, data);
  await enforceRateLimit(ctx.ip, 'founder', 5, 600);

  const id = input.requestId;
  return once('founder', id, async (c) => {
    await c.query(
      `insert into stepq.founder_messages (id, name, email, phone, topic, message)
       values ($1, $2, $3, $4, $5, $6)`,
      [id, input.name, input.email, input.phone || null, input.topic, input.message],
    );
    const phone = input.phone ? { phone: input.phone } : {};
    await queueMail(c, {
      to: env.founderInbox(),
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
