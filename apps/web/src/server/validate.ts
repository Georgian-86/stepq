import type { z } from 'zod';
import { ApiError } from './errors';

/** Parses `data`; on failure throws invalid-argument with `details.fields` (first message per field). */
export function parseOrThrow<S extends z.ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;
  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    fields[key] ??= issue.message;
  }
  throw new ApiError('invalid-argument', 'Check the highlighted fields', { fields });
}
