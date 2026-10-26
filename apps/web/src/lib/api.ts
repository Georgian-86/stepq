import type { Api, ApiErrorDetails, ApiName } from '@stepq/schemas';
import { ApiFieldError, GENERIC_ERROR, RATE_LIMIT_ERROR } from './apiErrors';

export { ApiFieldError, GENERIC_ERROR, RATE_LIMIT_ERROR };

/** Codes whose server message is written for people (see src/server/handlers). */
const USER_FACING = new Set([
  'already-exists',
  'not-found',
  'failed-precondition',
  'permission-denied',
]);

/** An error returned by the site's API (`{ error: { code, message, details } }`). */
export class ApiCallError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiCallError';
  }
}

function isFieldDetails(d: unknown): d is ApiErrorDetails {
  return (
    typeof d === 'object' &&
    d !== null &&
    typeof (d as { fields?: unknown }).fields === 'object' &&
    (d as { fields?: unknown }).fields !== null
  );
}

export function toApiError(e: unknown): Error {
  if (!(e instanceof ApiCallError)) return new Error(GENERIC_ERROR);
  if (e.code === 'invalid-argument' && isFieldDetails(e.details))
    return new ApiFieldError(e.details.fields);
  if (e.code === 'resource-exhausted') return new Error(RATE_LIMIT_ERROR);
  if (USER_FACING.has(e.code) && e.message) return new Error(e.message);
  return new Error(GENERIC_ERROR);
}

/** Bodies above this go up in parts (the host caps one request at 4.5 MB). */
export const CHUNK_CHARS = 3_000_000;
const CHUNK_HEADER = 'x-stepq-chunks';

async function post(path: string, body: string, headers: Record<string, string> = {}) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
  const payload = (await res.json().catch(() => null)) as {
    result?: unknown;
    error?: { code?: string; message?: string; details?: unknown };
  } | null;
  if (!res.ok || !payload || payload.error) {
    const err = payload?.error;
    throw new ApiCallError(err?.code ?? 'internal', err?.message ?? '', err?.details);
  }
  return payload.result;
}

/** Calls the site's API route `/api/<name>`; errors come back as people-readable messages. */
export async function call<K extends ApiName>(name: K, data: Api[K]['in']): Promise<Api[K]['out']> {
  // Preview builds only (PREVIEW_MODE). The env check is written out so webpack sees a
  // constant and drops the simulator chunk from live builds altogether.
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE === '1') {
    return (await import('./previewApi')).previewCall(name, data);
  }
  try {
    const body = JSON.stringify(data);
    if (body.length <= CHUNK_CHARS) return (await post(`/api/${name}`, body)) as Api[K]['out'];
    const id = crypto.randomUUID();
    const total = Math.ceil(body.length / CHUNK_CHARS);
    for (let index = 0; index < total; index++) {
      const part = body.slice(index * CHUNK_CHARS, (index + 1) * CHUNK_CHARS);
      await post('/api/chunk', JSON.stringify({ id, index, total, part }));
    }
    return (await post(`/api/${name}`, '', { [CHUNK_HEADER]: `${id}:${total}` })) as Api[K]['out'];
  } catch (e) {
    throw toApiError(e);
  }
}
