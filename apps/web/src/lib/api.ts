import type { Api, ApiErrorDetails, ApiName } from '@stepq/schemas';
import type { FirebaseError } from 'firebase/app';
import { ApiFieldError, GENERIC_ERROR, RATE_LIMIT_ERROR } from './apiErrors';

export { ApiFieldError, GENERIC_ERROR, RATE_LIMIT_ERROR };

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

/** Checked by name: importing the FirebaseError class would pull Firebase into the first load. */
function isFirebaseError(e: unknown): e is FirebaseError {
  return (
    e instanceof Error &&
    e.name === 'FirebaseError' &&
    typeof (e as FirebaseError).code === 'string'
  );
}

export function toApiError(e: unknown): Error {
  if (!isFirebaseError(e)) return new Error(GENERIC_ERROR);
  const code = e.code.replace(/^functions\//, '');
  const details = (e as FirebaseError & { details?: unknown }).details;
  if (code === 'invalid-argument' && isFieldDetails(details))
    return new ApiFieldError(details.fields);
  if (code === 'resource-exhausted') return new Error(RATE_LIMIT_ERROR);
  if (USER_FACING.has(code) && e.message) return new Error(e.message);
  return new Error(GENERIC_ERROR);
}

/**
 * Calls a callable Function. Firebase is loaded on first use, so it stays out of the first
 * paint of every page with a form (Lighthouse: the SDK is the largest part of the bundle).
 */
export async function call<K extends ApiName>(name: K, data: Api[K]['in']): Promise<Api[K]['out']> {
  // Preview builds only (PREVIEW_MODE). The env check is written out so webpack sees a
  // constant and drops the simulator chunk from live builds altogether.
  if (process.env.NEXT_PUBLIC_PREVIEW_MODE === '1') {
    return (await import('./previewApi')).previewCall(name, data);
  }
  try {
    const [{ httpsCallable }, { functions, initAppCheck }] = await Promise.all([
      import('firebase/functions'),
      import('./firebase'),
    ]);
    initAppCheck();
    const fn = httpsCallable<Api[K]['in'], Api[K]['out']>(functions, name);
    const res = await fn(data);
    return res.data;
  } catch (e) {
    throw toApiError(e);
  }
}
