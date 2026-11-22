import { createHash, randomBytes } from 'node:crypto';
import { firstName } from '@stepq/core';
import { requestParentConsentInput, respondParentConsentInput, type Api } from '@stepq/schemas';
import { z } from 'zod';
import { POLICY_VERSION } from '@/content/legal';
import { getUser } from '../admin/gotrue';
import { query, transaction } from '../db';
import { env } from '../env';
import { ApiError } from '../errors';
import { queueMail } from '../mail';
import { enforceRateLimit } from '../rateLimit';
import type { Ctx } from '../types';
import { parseOrThrow } from '../validate';

/**
 * Verifiable parental consent for app users aged 13 to 17 (DPDP Act s.9(1), DPDP Rules rule 10).
 *
 * 1. The teen's app calls requestParentConsent with their own Supabase access token and a
 *    parent's name and email. We check the token with Supabase Auth and the age on their
 *    profile, then email the parent a one-time link (only its SHA-256 is stored).
 * 2. The parent opens /parent-consent, sees what StepQ collects, declares they are the parent
 *    or guardian and an adult, and grants or declines (respondParentConsent).
 *
 * Until a parent grants consent, the database lets the teen's account do nothing but wait
 * (app.require_parental_consent in the app's migrations). The rows live in the app's
 * `app.parental_consents` table; this server writes them with its own connection.
 */

const notFound = () => new ApiError('not-found', 'This link is no longer valid.');
const hash = (s: string) => createHash('sha256').update(s).digest('hex');

type Status = 'pending' | 'granted' | 'declined' | 'withdrawn';

async function ensureTable(): Promise<void> {
  const { rows } = await query<{ ok: boolean }>(
    `select to_regclass('app.parental_consents') is not null as ok`,
  );
  if (!rows[0]?.ok) {
    throw new ApiError(
      'failed-precondition',
      'Parental consent is not set up yet. Try again later.',
    );
  }
}

export async function requestParentConsent(
  data: unknown,
  ctx: Ctx,
): Promise<Api['requestParentConsent']['out']> {
  const input = parseOrThrow(requestParentConsentInput, data);
  await enforceRateLimit(ctx.ip, 'parentConsent', 10, 3600);
  const user = await getUser(input.accessToken);
  if (!user) throw new ApiError('permission-denied', 'Sign in again, then try once more.');
  await enforceRateLimit(user.id, 'parentConsentUser', 3, 3600);
  await ensureTable();

  if (user.email && user.email.toLowerCase() === input.parentEmail) {
    throw new ApiError('invalid-argument', "Use your parent's email, not your own.", {
      fields: { parentEmail: "Use your parent's email, not your own." },
    });
  }

  const token = randomBytes(32).toString('base64url');
  return transaction(async (c) => {
    const { rows } = await c.query<{ display_name: string; minor: boolean | null }>(
      `select display_name, birthdate > (current_date - interval '18 years')::date as minor
       from app.profiles where id = $1`,
      [user.id],
    );
    const child = rows[0];
    if (!child) throw new ApiError('failed-precondition', 'Finish signing up first.');
    if (!child.minor) {
      throw new ApiError('failed-precondition', 'Parental consent is only needed under 18.');
    }
    const existing = await c.query<{ status: Status }>(
      'select status from app.parental_consents where child_id = $1 for update',
      [user.id],
    );
    if (existing.rows[0]?.status === 'granted') return { sentTo: input.parentEmail };

    await c.query(
      `insert into app.parental_consents (child_id, parent_name, parent_email, token_hash)
       values ($1, $2, $3, $4)
       on conflict (child_id) do update set
         parent_name = excluded.parent_name, parent_email = excluded.parent_email,
         token_hash = excluded.token_hash, status = 'pending', requested_at = now(),
         responded_at = null, request_count = app.parental_consents.request_count + 1`,
      [user.id, input.parentName, input.parentEmail, hash(token)],
    );
    await queueMail(c, {
      to: input.parentEmail,
      subject: '',
      template: 'parentConsent',
      props: {
        parentName: firstName(input.parentName),
        childName: firstName(child.display_name),
        consentUrl: `${env.siteUrl()}/parent-consent?token=${token}`,
      },
    });
    return { sentTo: input.parentEmail };
  });
}

export async function describeParentConsent(
  data: unknown,
  ctx: Ctx,
): Promise<Api['describeParentConsent']['out']> {
  const { token } = parseOrThrow(z.object({ token: z.string().min(20).max(200) }), data);
  await enforceRateLimit(ctx.ip, 'parentConsentView', 30, 600);
  await ensureTable();
  const { rows } = await query<{ display_name: string; status: Status }>(
    `select p.display_name, c.status from app.parental_consents c
     join app.profiles p on p.id = c.child_id where c.token_hash = $1`,
    [hash(token)],
  );
  const row = rows[0];
  if (!row) throw notFound();
  return { childName: firstName(row.display_name), status: row.status };
}

export async function respondParentConsent(
  data: unknown,
  ctx: Ctx,
): Promise<Api['respondParentConsent']['out']> {
  const input = parseOrThrow(respondParentConsentInput, data);
  await enforceRateLimit(ctx.ip, 'parentConsentRespond', 10, 600);
  await ensureTable();
  const status = input.decision === 'grant' ? 'granted' : 'declined';
  return transaction(async (c) => {
    const { rows } = await c.query<{ child_id: string; status: Status }>(
      'select child_id, status from app.parental_consents where token_hash = $1 for update',
      [hash(input.token)],
    );
    const row = rows[0];
    if (!row) throw notFound();
    if (row.status !== 'pending') {
      if (row.status === status) return { status };
      throw new ApiError('failed-precondition', 'This request was already answered.');
    }
    await c.query(
      `update app.parental_consents set status = $2, responded_at = now(), responder_name = $3,
         relationship = $4, responder_birth_year = $5, responder_ip_hash = $6, notice_version = $7
       where child_id = $1`,
      [
        row.child_id,
        status,
        input.parentName,
        input.relationship,
        input.birthYear,
        hash(`${ctx.ip}parentConsent`),
        POLICY_VERSION,
      ],
    );
    if (status === 'granted') {
      await c.query(
        `insert into app.consents (user_id, purpose, version) values ($1, 'parental', $2)`,
        [row.child_id, POLICY_VERSION],
      );
    }
    return { status };
  });
}
