import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useModalParam } from './useModalParam';

describe('useModalParam', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'));

  it('opens via ?modal=<name> with extra params and closes with the back button', async () => {
    const { result } = renderHook(() => useModalParam('founder'));
    expect(result.current.isOpen).toBe(false);
    act(() => result.current.open({ topic: 'partnership' }));
    expect(window.location.search).toBe('?modal=founder&topic=partnership');
    expect(result.current.isOpen).toBe(true);
    expect(result.current.params.get('topic')).toBe('partnership');

    act(() => window.history.back());
    await waitFor(() => expect(result.current.isOpen).toBe(false));
    expect(window.location.search).toBe('');
  });

  it('close() on a deep link removes the param without leaving the page', () => {
    window.history.replaceState(null, '', '/fund?modal=pay&utm_source=x');
    const { result } = renderHook(() => useModalParam('pay'));
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(window.location.pathname + window.location.search).toBe('/fund?utm_source=x');
  });

  it('ignores other modal names', () => {
    window.history.replaceState(null, '', '/?modal=pay');
    const { result } = renderHook(() => useModalParam('founder'));
    expect(result.current.isOpen).toBe(false);
  });
});
