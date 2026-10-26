import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiCallError,
  ApiFieldError,
  call,
  CHUNK_CHARS,
  GENERIC_ERROR,
  RATE_LIMIT_ERROR,
  toApiError,
} from './api';

const fetchMock = vi.fn();

function reply(status: number, body: unknown) {
  return Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe('call', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('POSTs the data to /api/<name> and returns the result', async () => {
    fetchMock.mockReturnValue(reply(200, { result: { available: true } }));
    await expect(call('checkUsername', { username: 'riya.walks' })).resolves.toEqual({
      available: true,
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/checkUsername');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ username: 'riya.walks' });
  });

  it('maps invalid-argument details.fields to ApiFieldError', async () => {
    fetchMock.mockReturnValue(
      reply(400, {
        error: {
          code: 'invalid-argument',
          message: 'Check the highlighted fields',
          details: { fields: { email: 'Enter a valid email' } },
        },
      }),
    );
    const err = await call('checkUsername', { username: 'x' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiFieldError);
    expect((err as ApiFieldError).fields).toEqual({ email: 'Enter a valid email' });
  });

  it('maps resource-exhausted to the friendly rate-limit message', async () => {
    fetchMock.mockReturnValue(reply(429, { error: { code: 'resource-exhausted', message: 'x' } }));
    await expect(call('checkUsername', { username: 'x' })).rejects.toThrow(RATE_LIMIT_ERROR);
  });

  it('sends a large body in parts, then calls with the chunk header', async () => {
    fetchMock.mockImplementation((url: string) =>
      reply(200, { result: url === '/api/chunk' ? { ok: true } : { firstName: 'Riya' } }),
    );
    const big = 'a'.repeat(CHUNK_CHARS + 10);
    await call('sendFounderMessage', { message: big } as never);
    const urls = fetchMock.mock.calls.map((c) => c[0]);
    expect(urls).toEqual(['/api/chunk', '/api/chunk', '/api/sendFounderMessage']);
    const parts = fetchMock.mock.calls.slice(0, 2).map((c) => JSON.parse(c[1].body));
    expect(parts.map((p) => [p.index, p.total])).toEqual([
      [0, 2],
      [1, 2],
    ]);
    expect(parts.map((p) => p.part).join('')).toBe(JSON.stringify({ message: big }));
    expect(fetchMock.mock.calls[2]![1].headers['x-stepq-chunks']).toBe(`${parts[0].id}:2`);
  });

  it('a network failure or non-JSON reply becomes the generic message', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(call('checkUsername', { username: 'x' })).rejects.toThrow(GENERIC_ERROR);
    fetchMock.mockReturnValue(Promise.resolve(new Response('<html>', { status: 502 })));
    await expect(call('checkUsername', { username: 'x' })).rejects.toThrow(GENERIC_ERROR);
  });
});

describe('toApiError', () => {
  it('keeps server messages for known user-facing codes, generic otherwise', () => {
    expect(toApiError(new ApiCallError('already-exists', 'Taken')).message).toBe('Taken');
    expect(toApiError(new ApiCallError('internal', 'INTERNAL')).message).toBe(GENERIC_ERROR);
    expect(toApiError(new TypeError('Failed to fetch')).message).toBe(GENERIC_ERROR);
  });
});

describe('a tab left open across a release', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('a missing script chunk reloads the page once and shows the generic message', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    window.sessionStorage.clear();
    const stale = Object.assign(new Error('Loading chunk 522 failed. (error: http://x/522.js)'), {
      name: 'ChunkLoadError',
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(stale));
    await expect(call('checkUsername', { username: 'x' })).rejects.toThrow(GENERIC_ERROR);
    await expect(call('checkUsername', { username: 'x' })).rejects.toThrow(GENERIC_ERROR);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
