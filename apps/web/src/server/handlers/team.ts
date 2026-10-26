import { firstName } from '@stepq/core';
import { RESUME_MAX_BYTES, ROLE_LABELS, teamApplicationInput, type Api } from '@stepq/schemas';
import { env } from '../env';
import { ApiError } from '../errors';
import { queueMail } from '../mail';
import { once } from '../once';
import { enforceRateLimit } from '../rateLimit';
import { signToken } from '../signedToken';
import type { Ctx } from '../types';
import { parseOrThrow } from '../validate';

const RESUME_ERROR = 'Upload a PDF up to 5 MB';
/** How long the résumé link in the founder's alert works. */
export const RESUME_LINK_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function resumeError(): ApiError {
  return new ApiError('invalid-argument', 'Check the highlighted fields', {
    fields: { resume: RESUME_ERROR },
  });
}

/** Schema errors on resume.* surface under the single `resume` field the form shows. */
function parseResumeFields(data: unknown) {
  try {
    return parseOrThrow(teamApplicationInput, data);
  } catch (e) {
    if (e instanceof ApiError && e.details) {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(e.details.fields))
        out[k.startsWith('resume.') ? 'resume' : k] ??= v;
      throw new ApiError(e.code, e.message, { fields: out });
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

export function resumeUrlFor(id: string): string {
  const token = signToken({ k: 'resume', id, exp: Date.now() + RESUME_LINK_TTL_MS });
  return `${env.siteUrl()}/api/resume?token=${token}`;
}

export async function submitTeamApplication(
  data: unknown,
  ctx: Ctx,
): Promise<Api['submitTeamApplication']['out']> {
  const input = parseResumeFields(data);
  const bytes = decodeResume(input.resume.base64);
  await enforceRateLimit(ctx.ip, 'team', 5, 600);

  const id = input.requestId;
  return once('team', id, async (c) => {
    await c.query(
      `insert into stepq.team_applications (id, name, email, phone, role, link, why, resume, resume_name)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        input.name,
        input.email,
        input.phone,
        input.role,
        input.link || null,
        input.why,
        bytes,
        input.resume.fileName,
      ],
    );
    await queueMail(c, {
      to: env.founderInbox(),
      subject: '',
      template: 'teamApplicationAlert',
      props: {
        name: input.name,
        email: input.email,
        phone: input.phone,
        roleLabel: ROLE_LABELS[input.role],
        ...(input.link ? { link: input.link } : {}),
        why: input.why,
        resumeUrl: resumeUrlFor(id),
      },
      replyTo: input.email,
    });
    return { firstName: firstName(input.name) };
  });
}
