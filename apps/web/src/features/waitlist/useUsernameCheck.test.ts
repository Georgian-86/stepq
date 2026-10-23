import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const call = vi.fn();
vi.mock('@/lib/api', () => ({ call }));

const { useUsernameCheck, CHECK_DEBOUNCE_MS } = await import('./useUsernameCheck');

describe('useUsernameCheck', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    call.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  async function settle(ms = CHECK_DEBOUNCE_MS) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });
  }

  it('debounces 400 ms, shows checking, then available', async () => {
    let resolve!: (v: unknown) => void;
    call.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result, rerender } = renderHook(({ v }) => useUsernameCheck(v), {
      initialProps: { v: '' },
    });
    expect(result.current.state).toBe('idle');
    rerender({ v: 'riya' });
    rerender({ v: '@Riya.walks' });
    expect(result.current.state).toBe('checking');
    await settle(CHECK_DEBOUNCE_MS - 1);
    expect(call).not.toHaveBeenCalled();
    await settle(1);
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith('checkUsername', { username: 'riya.walks' });
    await act(async () => resolve({ available: true }));
    expect(result.current).toEqual({ state: 'available', username: 'riya.walks' });
  });

  it('reports taken and reserved names from the server', async () => {
    call.mockResolvedValueOnce({ available: false, reason: 'taken' });
    const { result, rerender } = renderHook(({ v }) => useUsernameCheck(v), {
      initialProps: { v: 'riya.walks' },
    });
    await settle();
    expect(result.current.state).toBe('taken');
    expect(result.current.message).toBe('Taken');

    call.mockResolvedValueOnce({ available: false, reason: 'reserved' });
    rerender({ v: 'stepq' });
    await settle();
    expect(result.current.state).toBe('invalid');
  });

  it('flags malformed names locally without calling the server', async () => {
    const { result } = renderHook(() => useUsernameCheck('.ri'));
    await settle();
    expect(call).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({
      state: 'invalid',
      message: 'Use 3–20 letters, numbers, . or _',
    });
  });

  it('ignores a stale answer for an older value', async () => {
    let first!: (v: unknown) => void;
    call
      .mockReturnValueOnce(new Promise((r) => (first = r)))
      .mockResolvedValueOnce({ available: false, reason: 'taken' });
    const { result, rerender } = renderHook(({ v }) => useUsernameCheck(v), {
      initialProps: { v: 'aaa' },
    });
    await settle();
    rerender({ v: 'bbb' });
    await settle();
    await act(async () => first({ available: true }));
    expect(result.current).toMatchObject({ state: 'taken', username: 'bbb' });
  });
});
