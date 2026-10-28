import { firstName } from '@stepq/core';
import { normalizeUsername, usernameProblem, waitlistInput, type Api } from '@stepq/schemas';
import { z } from 'zod';
import { isUniqueViolation, query, transaction } from '../db';
import { env } from '../env';
import { ApiError } from '../errors';
import { queueMail } from '../mail';
import { once } from '../once';
import { enforceRateLimit } from '../rateLimit';
import { signToken, verifyToken } from '../signedToken';
import type { Ctx } from '../types';
import { parseOrThrow } from '../validate';

const MIN = 60_000;
const DAY = 24 * 60 * MIN;

type Entry = { id: string; position: number | null; name: string; username: string | null };

export async function joinWaitlist(data: unknown, ctx: Ctx): Promise<Api['joinWaitlist']['out']> {
  const input = parseOrThrow(waitlistInput, data);
  await enforceRateLimit(ctx.ip, 'join', 10, 600);

  return once('join', input.requestId, async (c) => {
    const inserted = await c.query<{ id: string }>(
      `insert into stepq.waitlist (name, email, gender, age_group, country, source)
       values ($1, $2, $3, $4, $5, $6) on conflict (email) do nothing returning id`,
      [input.name, input.email, input.gender, input.ageGroup, input.country, input.source ?? null],
    );
    const id = inserted.rows[0]?.id;
    if (!id) {
      // Already on the list: send their reserve link again if they have no username yet.
      const { rows } = await c.query<Entry>(
        'select id, position, name, username from stepq.waitlist where email = $1',
        [input.email],
      );
      const entry = rows[0]!;
      const position = entry.position ?? 0;
      if (!entry.username) {
        const token = signToken({ k: 'reserve', id: entry.id, exp: Date.now() + 7 * DAY });
        await queueMail(c, {
          to: input.email,
          subject: '',
          template: 'reserveLink',
          props: {
            firstName: firstName(entry.name),
            position,
            reserveUrl: `${env.siteUrl()}/?modal=reserve&token=${token}`,
          },
        });
      }
      return { status: 'existing' as const, position, email: input.email };
    }
    // The stats row lock serialises joins, so positions are gap-free and unique.
    const { rows } = await c.query<{ waitlist_count: number }>(
      `update stepq.stats set waitlist_count = waitlist_count + 1, updated_at = now()
       where id = 1 returning waitlist_count`,
    );
    const position = rows[0]!.waitlist_count;
    await c.query('update stepq.waitlist set position = $2 where id = $1', [id, position]);
    return {
      status: 'joined' as const,
      position,
      reserveToken: signToken({ k: 'reserve', id, exp: Date.now() + 30 * MIN }),
      email: input.email,
    };
  });
}

export async function checkUsername(data: unknown, ctx: Ctx): Promise<Api['checkUsername']['out']> {
  const { username } = parseOrThrow(z.object({ username: z.string().max(100) }), data);
  await enforceRateLimit(ctx.ip, 'checkUsername', 60, 600);
  const problem = usernameProblem(username);
  if (problem) return { available: false, reason: problem };
  const { rowCount } = await query('select 1 from stepq.waitlist where username = $1', [
    normalizeUsername(username),
  ]);
  return rowCount ? { available: false, reason: 'taken' } : { available: true };
}

const taken = () =>
  new ApiError('already-exists', 'Taken. Try another.', {
    fields: { username: 'Taken. Try another.' },
  });

export async function reserveUsername(data: unknown): Promise<Api['reserveUsername']['out']> {
  const { username: raw, reserveToken } = parseOrThrow(
    z.object({ username: z.string().max(100), reserveToken: z.string().max(1000) }),
    data,
  );
  const { id } = verifyToken(reserveToken, 'reserve');
  const problem = usernameProblem(raw);
  if (problem) {
    throw new ApiError('invalid-argument', 'Check the highlighted fields', {
      fields: {
        username:
          problem === 'reserved' ? 'That name is reserved.' : 'Use 3–20 letters, numbers, . or _',
      },
    });
  }
  const username = normalizeUsername(raw);
  try {
    await transaction(async (c) => {
      const { rows } = await c.query<{ username: string | null }>(
        'select username from stepq.waitlist where id = $1 for update',
        [id],
      );
      if (!rows[0]) throw new ApiError('permission-denied', 'This link is not valid.');
      const existing = rows[0].username;
      if (existing) throw new ApiError('failed-precondition', `You already reserved @${existing}`);
      await c.query('update stepq.waitlist set username = $2 where id = $1', [id, username]);
    });
  } catch (e) {
    throw isUniqueViolation(e) ? taken() : e;
  }
  return { username };
}
