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
