import type { Api, ApiName } from '@stepq/schemas';
import { z } from 'zod';
import { query, transaction } from './db';
import { ApiError, HTTP_STATUS } from './errors';
import { confirmAction, describeAction } from './handlers/actions';
import { submitAmbassador } from './handlers/ambassador';
import { recordBacking } from './handlers/backing';
import { sendFounderMessage } from './handlers/founder';
import { submitTeamApplication } from './handlers/team';
import { checkUsername, joinWaitlist, reserveUsername } from './handlers/waitlist';
import { enforceRateLimit } from './rateLimit';
import type { Ctx } from './types';
import { parseOrThrow } from './validate';

type Handler<K extends ApiName> = (data: unknown, ctx: Ctx) => Promise<Api[K]['out']>;

export const HANDLERS: { [K in ApiName]: Handler<K> } = {
  joinWaitlist,
  checkUsername,
  reserveUsername,
  submitTeamApplication,
  submitAmbassador,
  recordBacking,
  sendFounderMessage,
  describeAction,
  confirmAction,
};

export function isApiName(name: string): name is ApiName {
  return Object.hasOwn(HANDLERS, name);
}

/**
 * Client IP for rate limiting. Vercel sets x-real-ip itself; otherwise use the rightmost
 * x-forwarded-for hop (the leftmost ones are supplied by the client).
 */
export function clientIp(headers: Headers): string {
  const real = headers.get('x-real-ip')?.trim();
  if (real) return real;
  const hops = (headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  return hops[hops.length - 1] || 'unknown';
}

/** Browsers send Origin on cross-site POSTs: only this site's own pages may call the API. */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}

export function errorResponse(e: unknown): Response {
  if (e instanceof ApiError) {
    return json(
      { error: { code: e.code, message: e.message, ...(e.details ? { details: e.details } : {}) } },
      HTTP_STATUS[e.code],
    );
  }
  console.error('api error', e);
  return json({ error: { code: 'internal', message: 'Internal error' } }, 500);
}

/** Large bodies (a 5 MB résumé) arrive in parts: Vercel caps one request body at 4.5 MB. */
export const CHUNK_HEADER = 'x-stepq-chunks';
export const MAX_CHUNKS = 4;
export const MAX_CHUNK_CHARS = 3_200_000;

const chunkInput = z.object({
  id: z.string().uuid(),
  index: z
    .number()
    .int()
    .min(0)
    .max(MAX_CHUNKS - 1),
  total: z.number().int().min(2).max(MAX_CHUNKS),
  part: z.string().min(1).max(MAX_CHUNK_CHARS),
});

export async function storeChunk(req: Request): Promise<Response> {
  try {
    if (!sameOrigin(req)) throw new ApiError('permission-denied', 'Not allowed.');
    const input = parseOrThrow(chunkInput, await req.json().catch(() => null));
    if (input.index >= input.total) throw new ApiError('invalid-argument', 'Bad chunk.');
    await enforceRateLimit(clientIp(req.headers), 'chunk', 40, 600);
    // Parts nobody assembled within an hour are abandoned uploads.
    await query(`delete from stepq.chunks where created_at < now() - interval '1 hour'`);
    await query(
      `insert into stepq.chunks (id, idx, total, part) values ($1, $2, $3, $4)
       on conflict (id, idx) do update set part = excluded.part`,
      [input.id, input.index, input.total, input.part],
    );
    return json({ result: { ok: true } });
  } catch (e) {
    return errorResponse(e);
  }
}

async function readChunkedBody(header: string): Promise<unknown> {
  const [id, totalRaw] = header.split(':');
  const total = Number(totalRaw);
  if (!z.string().uuid().safeParse(id).success || !Number.isInteger(total) || total > MAX_CHUNKS) {
    throw new ApiError('invalid-argument', 'Bad upload.');
  }
  const text = await transaction(async (c) => {
    const { rows } = await c.query<{ part: string }>(
      'delete from stepq.chunks where id = $1 and total = $2 returning idx, part',
      [id, total],
    );
    if (rows.length !== total)
      throw new ApiError('invalid-argument', 'Upload incomplete. Try again.');
    return (rows as { idx: number; part: string }[])
      .sort((a, b) => a.idx - b.idx)
      .map((r) => r.part)
      .join('');
  });
  return JSON.parse(text);
}

export async function handleCall(name: string, req: Request): Promise<Response> {
  try {
    if (!isApiName(name)) throw new ApiError('not-found', 'Unknown endpoint.');
    if (!sameOrigin(req)) throw new ApiError('permission-denied', 'Not allowed.');
    const chunked = req.headers.get(CHUNK_HEADER);
    const data = chunked ? await readChunkedBody(chunked) : await req.json().catch(() => null);
    const result = await HANDLERS[name](data, { ip: clientIp(req.headers) });
    return json({ result });
  } catch (e) {
    return errorResponse(e);
  }
}
