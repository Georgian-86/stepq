import { FirebaseError } from 'firebase/app';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const callable = vi.fn();
vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(
    (_functions: unknown, name: string) => (data: unknown) => callable(name, data),
  ),
}));
vi.mock('./firebase', () => ({ functions: {}, initAppCheck: vi.fn() }));

const { call, ApiFieldError, toApiError, GENERIC_ERROR, RATE_LIMIT_ERROR } = await import('./api');

function fnError(code: string, message: string, details?: unknown) {
  return Object.assign(new FirebaseError(`functions/${code}`, message), { details });
}

describe('call', () => {
  beforeEach(() => {
    callable.mockReset();
  });

  it('calls the named callable and returns its data', async () => {
    callable.mockResolvedValue({ data: { available: true } });
    await expect(call('checkUsername', { username: 'riya.walks' })).resolves.toEqual({
      available: true,
    });
    expect(callable).toHaveBeenCalledWith('checkUsername', { username: 'riya.walks' });
  });

  it('maps invalid-argument details.fields to ApiFieldError', async () => {
    const rejected = fnError('invalid-argument', 'Invalid input', {
      fields: { email: 'Enter a valid email' },
    });
    callable.mockImplementation(async () => {
      throw rejected;
    });
    const err = await call('checkUsername', { username: 'x' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiFieldError);
    expect((err as InstanceType<typeof ApiFieldError>).fields).toEqual({
      email: 'Enter a valid email',
    });
  });

  it('maps resource-exhausted to the friendly rate-limit message', async () => {
    const rejected = fnError('resource-exhausted', 'Too many tries. Please wait a few minutes.');
    callable.mockImplementation(async () => {
      throw rejected;
    });
    await expect(call('checkUsername', { username: 'x' })).rejects.toThrow(RATE_LIMIT_ERROR);
  });
});

describe('toApiError', () => {
  it('keeps server messages for known user-facing codes, generic otherwise', () => {
    expect(toApiError(fnError('already-exists', 'Taken')).message).toBe('Taken');
    expect(toApiError(fnError('internal', 'INTERNAL')).message).toBe(GENERIC_ERROR);
    expect(toApiError(new TypeError('Failed to fetch')).message).toBe(GENERIC_ERROR);
  });
});
