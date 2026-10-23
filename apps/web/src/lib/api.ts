import type { Api, ApiErrorDetails, ApiName } from '@stepq/schemas';
import { FirebaseError } from 'firebase/app';
import { httpsCallable } from 'firebase/functions';
import { functions, initAppCheck } from './firebase';

export const GENERIC_ERROR = 'Something went wrong. Please try again.';
export const RATE_LIMIT_ERROR = 'Too many tries. Please wait a few minutes.';

/** Field-level validation errors from a callable (`invalid-argument` with `details.fields`). */
export class ApiFieldError extends Error {
  constructor(
    public readonly fields: Record<string, string>,
    message = 'Please check the highlighted fields.',
  ) {
    super(message);
    this.name = 'ApiFieldError';
  }
}

/** Codes whose server message is written for people (see functions/src/handlers). */
const USER_FACING = new Set([
  'already-exists',
  'not-found',
  'failed-precondition',
  'permission-denied',
]);

function isFieldDetails(d: unknown): d is ApiErrorDetails {
  return (
    typeof d === 'object' &&
    d !== null &&
    typeof (d as { fields?: unknown }).fields === 'object' &&
    (d as { fields?: unknown }).fields !== null
  );
}

export function toApiError(e: unknown): Error {
  if (!(e instanceof FirebaseError)) return new Error(GENERIC_ERROR);
  const code = e.code.replace(/^functions\//, '');
  const details = (e as FirebaseError & { details?: unknown }).details;
  if (code === 'invalid-argument' && isFieldDetails(details))
    return new ApiFieldError(details.fields);
  if (code === 'resource-exhausted') return new Error(RATE_LIMIT_ERROR);
  if (USER_FACING.has(code) && e.message) return new Error(e.message);
  return new Error(GENERIC_ERROR);
}

export async function call<K extends ApiName>(name: K, data: Api[K]['in']): Promise<Api[K]['out']> {
  initAppCheck();
  const fn = httpsCallable<Api[K]['in'], Api[K]['out']>(functions, name);
  try {
    const res = await fn(data);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
