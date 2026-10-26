import { buildUpiLink, newReference } from '@stepq/core';
import { backingInput, type Api } from '@stepq/schemas';
import { env } from '../env';
import { queueMail } from '../mail';
import { once } from '../once';
import { enforceRateLimit } from '../rateLimit';
import { signToken } from '../signedToken';
import type { Ctx } from '../types';
import { parseOrThrow } from '../validate';

const VERIFY_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const istFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  dateStyle: 'medium',
  timeStyle: 'short',
});

export async function recordBacking(data: unknown, ctx: Ctx): Promise<Api['recordBacking']['out']> {
  const input = parseOrThrow(backingInput, data);
  await enforceRateLimit(ctx.ip, 'backing', 10, 600);

  const id = input.requestId;
  return once('backing', id, async (c) => {
    const reference = newReference();
    await c.query(
      `insert into stepq.backings (id, name, phone, amount, show_on_wall, reference)
       values ($1, $2, $3, $4, $5, $6)`,
      [id, input.name, input.phone, input.amount, input.showOnWall, reference],
    );
    const token = signToken({ k: 'verifyBacking', id, exp: Date.now() + VERIFY_LINK_TTL_MS });
    await queueMail(c, {
      to: env.founderInbox(),
      subject: '',
      template: 'backingAlert',
      props: {
        name: input.name,
        phone: input.phone,
        amount: input.amount,
        reference,
        createdAtIst: istFormat.format(new Date()),
        showOnWall: input.showOnWall,
        verifyUrl: `${env.siteUrl()}/confirm?token=${token}`,
      },
    });
    return {
      reference,
      amount: input.amount,
      upiLink: buildUpiLink({ amount: input.amount, note: `StepQ ${reference}` }),
    };
  });
}
