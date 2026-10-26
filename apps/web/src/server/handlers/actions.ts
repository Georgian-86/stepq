import { firstName, wallName } from '@stepq/core';
import { actionTokenInput, type ActionKind, type Api } from '@stepq/schemas';
import { query, transaction } from '../db';
import { env } from '../env';
import { ApiError } from '../errors';
import { queueMail } from '../mail';
import { enforceRateLimit } from '../rateLimit';
import { verifyAnyToken } from '../signedToken';
import type { Ctx } from '../types';
import { parseOrThrow } from '../validate';

/** Kinds the /confirm page acts on; 'reserve' tokens belong to the waitlist flow. */
const ACTION_KINDS = [
  'approveAmbassador',
  'verifyBacking',
] as const satisfies readonly ActionKind[];
type HandledKind = (typeof ACTION_KINDS)[number];

const notFound = () => new ApiError('not-found', 'This link is no longer valid.');

type Application = { name: string; email: string; city: string; status: string };
type Backing = {
  name: string;
  amount: number;
  reference: string;
  show_on_wall: boolean;
  status: string;
};

async function describe(
  kind: HandledKind,
  id: string,
): Promise<{ summary: string; done: boolean }> {
  switch (kind) {
    case 'approveAmbassador': {
      const { rows } = await query<Application>(
        'select name, city, status from stepq.ambassador_applications where id = $1',
        [id],
      );
      const a = rows[0];
      if (!a) throw notFound();
      return {
        summary: `Approve ${a.name} (${a.city}) as an ambassador?`,
        done: a.status === 'approved',
      };
    }
    case 'verifyBacking': {
      const { rows } = await query<Backing>(
        'select name, amount, reference, status from stepq.backings where id = $1',
        [id],
      );
      const b = rows[0];
      if (!b) throw notFound();
      return {
        summary: `Verify ₹${b.amount.toLocaleString('en-IN')} from ${wallName(b.name)} (ref ${b.reference})?`,
        done: b.status === 'verified',
      };
    }
    default: {
      const unhandled: never = kind;
      throw new ApiError('internal', `Unhandled action ${String(unhandled)}`);
    }
  }
}

async function confirm(kind: HandledKind, id: string): Promise<void> {
  switch (kind) {
    case 'approveAmbassador':
      await transaction(async (c) => {
        const { rows } = await c.query<Application>(
          'select name, email, city, status from stepq.ambassador_applications where id = $1 for update',
          [id],
        );
        const a = rows[0];
        if (!a) throw notFound();
        if (a.status === 'approved') return;
        await c.query(
          `update stepq.ambassador_applications set status = 'approved', approved_at = now() where id = $1`,
          [id],
        );
        const kitUrl = env.ambassadorKitUrl();
        await queueMail(c, {
          to: a.email,
          subject: '',
          template: 'ambassadorApproved',
          props: { firstName: firstName(a.name), city: a.city, ...(kitUrl ? { kitUrl } : {}) },
        });
      });
      return;
    case 'verifyBacking':
      await transaction(async (c) => {
        const { rows } = await c.query<Backing>(
          'select name, show_on_wall, status from stepq.backings where id = $1 for update',
          [id],
        );
        const b = rows[0];
        if (!b) throw notFound();
        if (b.status === 'verified') return;
        await c.query(
          `update stepq.backings set status = 'verified', verified_at = now(), wall_name = $2
           where id = $1`,
          [id, b.show_on_wall ? wallName(b.name) : null],
        );
      });
      return;
    default: {
      const unhandled: never = kind;
      throw new ApiError('internal', `Unhandled action ${String(unhandled)}`);
    }
  }
}

export async function describeAction(
  data: unknown,
  ctx: Ctx,
): Promise<Api['describeAction']['out']> {
  const { token } = parseOrThrow(actionTokenInput, data);
  await enforceRateLimit(ctx.ip, 'describeAction', 60, 600);
  const { k, id } = verifyAnyToken(token, ACTION_KINDS);
  return { kind: k, ...(await describe(k, id)) };
}

export async function confirmAction(data: unknown, ctx: Ctx): Promise<Api['confirmAction']['out']> {
  const { token } = parseOrThrow(actionTokenInput, data);
  await enforceRateLimit(ctx.ip, 'confirmAction', 20, 600);
  const { k, id } = verifyAnyToken(token, ACTION_KINDS);
  await confirm(k, id);
  return { done: true };
}
