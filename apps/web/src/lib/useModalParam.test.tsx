import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Stand-in for Next's useSearchParams: a router navigation (Link / router.push) changes the URL
// without popstate, and Next re-renders useSearchParams consumers.
let nextSearch = '';
const useSearchParams = vi.fn(() => new URLSearchParams(nextSearch));
vi.mock('next/navigation', () => ({ useSearchParams }));

const { useModalParam, openModalParam } = await import('./useModalParam');

describe('useModalParam', () => {
  beforeEach(() => {
    nextSearch = '';
    window.history.replaceState(null, '', '/');
  });

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

  it('pushes only its own marker into history state (Next adds its internals itself)', () => {
    window.history.replaceState({ __NA: true, tree: 'x' }, '', '/');
    const { result } = renderHook(() => useModalParam('founder'));
    act(() => result.current.open());
    expect(window.history.state).toEqual({ __stepqModal: 'founder' });
  });

  it('notices opens made by a Next router navigation (useSearchParams)', () => {
    const { result, rerender } = renderHook(() => useModalParam('founder'));
    expect(result.current.isOpen).toBe(false);
    expect(useSearchParams).toHaveBeenCalled(); // subscribes the hook to Next navigations
    window.history.replaceState(null, '', '/?modal=founder');
    nextSearch = '?modal=founder';
    rerender();
    expect(result.current.isOpen).toBe(true);
  });

  it('openModalParam opens without a hook', () => {
    const { result } = renderHook(() => useModalParam('founder'));
    act(() => openModalParam('founder', { topic: 'partnership' }));
    expect(result.current.isOpen).toBe(true);
    expect(result.current.params.get('topic')).toBe('partnership');
  });
});
