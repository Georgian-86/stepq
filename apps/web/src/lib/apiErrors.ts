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
