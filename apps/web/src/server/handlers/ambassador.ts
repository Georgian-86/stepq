import { firstName } from '@stepq/core';
import { ambassadorInput, FOLLOWERS_LABELS, type Api } from '@stepq/schemas';
import { env } from '../env';
import { queueMail } from '../mail';
import { once } from '../once';
import { enforceRateLimit } from '../rateLimit';
import { signToken } from '../signedToken';
import type { Ctx } from '../types';
import { parseOrThrow } from '../validate';

const APPROVE_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function submitAmbassador(
  data: unknown,
  ctx: Ctx,
): Promise<Api['submitAmbassador']['out']> {
  const input = parseOrThrow(ambassadorInput, data);
  await enforceRateLimit(ctx.ip, 'ambassador', 5, 600);

  const id = input.requestId;
  return once('ambassador', id, async (c) => {
    await c.query(
      `insert into stepq.ambassador_applications
         (id, name, email, phone, city, instagram, followers, college_or_company, plan)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        input.name,
        input.email,
        input.phone,
        input.city,
        input.instagram,
        input.followers,
        input.collegeOrCompany,
        input.plan,
      ],
    );
    const token = signToken({ k: 'approveAmbassador', id, exp: Date.now() + APPROVE_LINK_TTL_MS });
    await queueMail(c, {
      to: env.founderInbox(),
      subject: '',
      template: 'ambassadorAlert',
      props: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        city: input.city,
        instagram: input.instagram,
        instagramUrl: `https://instagram.com/${input.instagram}`,
        followersLabel: FOLLOWERS_LABELS[input.followers],
        collegeOrCompany: input.collegeOrCompany,
        plan: input.plan,
        approveUrl: `${env.siteUrl()}/confirm?token=${token}`,
      },
      replyTo: input.email,
    });
    return { firstName: firstName(input.name) };
  });
}
