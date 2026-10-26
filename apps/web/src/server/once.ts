import { z } from 'zod';
import { transaction, type Client } from './db';
import { ApiError } from './errors';

const uuid = z.string().uuid();

/**
 * Runs `fn` for (action, requestId) exactly once, in one transaction with its writes; a repeat
 * (a retry after a dropped response) waits for the first to commit and returns its stored
 * result. The result must be JSON-serialisable.
 */
export async function once<T>(
  action: string,
  requestId: string,
  fn: (c: Client) => Promise<T>,
): Promise<T> {
  if (!uuid.safeParse(requestId).success) {
    throw new ApiError('invalid-argument', 'Invalid request id.');
  }
  const key = `${action}:${requestId}`;
  return transaction(async (c) => {
    // A concurrent first call holds the row lock: this insert waits, then does nothing.
    const claimed = await c.query(
      'insert into stepq.requests (key) values ($1) on conflict do nothing returning key',
      [key],
    );
    if (claimed.rowCount === 0) {
      const { rows } = await c.query<{ result: T }>(
        'select result from stepq.requests where key = $1',
        [key],
      );
      return rows[0]!.result;
    }
    const result = JSON.parse(JSON.stringify((await fn(c)) ?? null)) as T;
    await c.query('update stepq.requests set result = $2 where key = $1', [
      key,
      JSON.stringify(result),
    ]);
    return result;
  });
}
