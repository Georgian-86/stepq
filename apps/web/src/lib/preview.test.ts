import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();

describe('preview mode (NEXT_PUBLIC_PREVIEW_MODE=1)', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_PREVIEW_MODE', '1');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('call() is simulated and never reaches the API', async () => {
    const { call } = await import('./api');
    // Real timers: the simulator is a lazily imported chunk, then waits ~600 ms.
    await expect(call('checkUsername', { username: 'riya.walks' })).resolves.toEqual({
      available: true,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('public docs read as missing (count 0, no backers) without polling', async () => {
    const { usePublicDoc } = await import('./usePublicDoc');
    const { result } = renderHook(() => usePublicDoc('stats'));
    expect(result.current).toBeNull();
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('flag off', () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubEnv('NEXT_PUBLIC_PREVIEW_MODE', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('calls the real API route', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ result: { available: true } })));
    const { call } = await import('./api');
    await expect(call('checkUsername', { username: 'riya.walks' })).resolves.toEqual({
      available: true,
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/checkUsername', expect.anything());
  });

  it('public docs are read from /api/public/<id>', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ waitlistCount: 42 })));
    const { usePublicDoc } = await import('./usePublicDoc');
    const { result } = renderHook(() => usePublicDoc('stats'));
    expect(result.current).toBeUndefined();
    await waitFor(() => expect(result.current).toEqual({ waitlistCount: 42 }));
    expect(fetchMock).toHaveBeenCalledWith('/api/public/stats', { cache: 'no-store' });
  });
});
