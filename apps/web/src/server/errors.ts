import type { ApiErrorCode } from '@stepq/schemas';

/** An error whose code and message reach the client (the callable `HttpsError` equivalent). */
export class ApiError extends Error {
  constructor(
    public readonly code: ApiErrorCode | 'internal',
    message: string,
    public readonly details?: { fields: Record<string, string> },
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const HTTP_STATUS: Record<ApiError['code'], number> = {
  'invalid-argument': 400,
  'permission-denied': 403,
  'not-found': 404,
  'already-exists': 409,
  'failed-precondition': 412,
  'resource-exhausted': 429,
  internal: 500,
};

/**
 * What may be logged about an error: name, code and message, with any connection string and
 * the database password removed (driver errors can quote them).
 */
export function loggable(e: unknown): { name?: string; code?: string; message: string } {
  const err = e instanceof Error ? (e as Error & { code?: unknown }) : null;
  let message = err ? err.message : String(e);
  message = message.replace(/postgres(?:ql)?:\/\/\S+/gi, '[database url]');
  const secret = /:\/\/[^:@]+:(.+)@[^@]+$/.exec(
    (process.env.DATABASE_URL ?? '').replace(/\s+/g, ''),
  )?.[1];
  if (secret) message = message.split(secret).join('[redacted]');
  return {
    ...(err ? { name: err.name } : {}),
    ...(err && typeof err.code === 'string' ? { code: err.code } : {}),
    message: message.slice(0, 500),
  };
}
