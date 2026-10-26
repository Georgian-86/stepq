import { createHash } from 'node:crypto';
import { query } from './db';
import { ApiError } from './errors';

/** Allows `limit` calls of `action` per client IP per `windowSec`, counted atomically in Postgres. */
export async function enforceRateLimit(
  ip: string,
  action: string,
  limit: number,
  windowSec: number,
): Promise<void> {
  const key = createHash('sha256')
    .update(ip + action)
    .digest('hex');
  const { rows } = await query<{ count: number }>(
    `insert into stepq.rate_limits (key, count, reset_at)
       values ($1, 1, now() + make_interval(secs => $2))
     on conflict (key) do update set
       count = case when stepq.rate_limits.reset_at <= now() then 1 else stepq.rate_limits.count + 1 end,
       reset_at = case when stepq.rate_limits.reset_at <= now() then excluded.reset_at
                  else stepq.rate_limits.reset_at end
     returning count`,
    [key, windowSec],
  );
  if (rows[0]!.count > limit) {
    throw new ApiError('resource-exhausted', 'Too many tries. Please wait a few minutes.');
  }
}
