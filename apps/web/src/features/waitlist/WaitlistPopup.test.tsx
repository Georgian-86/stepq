import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let pathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
const call = vi.fn();
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), call }));
vi.mock('@/lib/firebase', () => ({ functions: {}, db: {}, initAppCheck: vi.fn() }));

const { WaitlistProvider } = await import('./WaitlistState');
const { WaitlistPopup, POPUP_DELAY_MS, SNOOZE_KEY, SHOWN_KEY } = await import('./WaitlistPopup');

function renderPopup(extra?: React.ReactNode) {
  return render(
    <WaitlistProvider>
      {extra}
      <WaitlistPopup />
    </WaitlistProvider>,
  );
}

const popup = () => screen.queryByRole('dialog', { name: 'Join the waitlist' });

describe('WaitlistPopup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    pathname = '/';
    window.sessionStorage.clear();
    window.localStorage.clear();
    window.history.replaceState(null, '', '/');
    Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });
    call.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('opens 5 s after landing, not before', () => {
    renderPopup();
    act(() => vi.advanceTimersByTime(POPUP_DELAY_MS - 1));
    expect(popup()).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(popup()).not.toBeNull();
    expect(window.sessionStorage.getItem(SHOWN_KEY)).toBe('1');
  });

  it('"Not now" closes it and snoozes it for a week', () => {
    renderPopup();
    act(() => vi.advanceTimersByTime(POPUP_DELAY_MS));
    fireEvent.click(screen.getByRole('button', { name: 'Not now' }));
    act(() => vi.advanceTimersByTime(500));
    expect(popup()).toBeNull();
    expect(Number(window.localStorage.getItem(SNOOZE_KEY))).toBeGreaterThan(0);
  });

  it('stays away when snoozed, already shown this visit, or already joined', () => {
    window.localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    const a = renderPopup();
    act(() => vi.advanceTimersByTime(POPUP_DELAY_MS));
    expect(popup()).toBeNull();
    a.unmount();

    window.localStorage.clear();
    window.sessionStorage.setItem(SHOWN_KEY, '1');
    const b = renderPopup();
    act(() => vi.advanceTimersByTime(POPUP_DELAY_MS));
    expect(popup()).toBeNull();
    b.unmount();

    window.sessionStorage.clear();
    window.sessionStorage.setItem(
      'stepq.waitlist',
      JSON.stringify({ status: 'joined', position: 3, email: 'a@b.in' }),
    );
    renderPopup();
    act(() => vi.advanceTimersByTime(POPUP_DELAY_MS));
    expect(popup()).toBeNull();
  });

  it('never interrupts someone using the page’s own waitlist form', () => {
    renderPopup(
      <section id="waitlist">
        <input aria-label="Full name" />
      </section>,
    );
    fireEvent.focusIn(screen.getByLabelText('Full name'));
    act(() => vi.advanceTimersByTime(POPUP_DELAY_MS));
    expect(popup()).toBeNull();
  });

  it('is quiet on confirm, privacy and thank-you pages, and in automated browsers', () => {
    pathname = '/fund/thank-you';
    const a = renderPopup();
    act(() => vi.advanceTimersByTime(POPUP_DELAY_MS));
    expect(popup()).toBeNull();
    a.unmount();

    pathname = '/';
    Object.defineProperty(navigator, 'webdriver', { value: true, configurable: true });
    renderPopup();
    act(() => vi.advanceTimersByTime(POPUP_DELAY_MS));
    expect(popup()).toBeNull();
  });
});
