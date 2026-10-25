import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PIKO_HELLO, PIKO_PROMISE, PikoIntro } from './PikoIntro';

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion: reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe('PikoIntro', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('gives assistive tech the introduction as text; the handwriting and arrow are decorative', () => {
    stubReducedMotion(false);
    const { container } = render(<PikoIntro />);
    expect(
      screen.getByText(`${PIKO_HELLO} ${PIKO_PROMISE}`, { selector: '.sr-only' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(PIKO_HELLO, { selector: 'span' }).closest('[aria-hidden]'),
    ).not.toBeNull();
    expect(container.querySelector('.piko-arrow')).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.piko-walk')).not.toBeNull();
  });

  it('tapping Piko cheers, wiggles the note, then walks again', () => {
    stubReducedMotion(false);
    const { container } = render(<PikoIntro />);
    const note = container.querySelector('[data-piko-note]')!;
    fireEvent.click(screen.getByRole('button', { name: 'Say hi to Piko' }));
    expect(container.querySelector('.piko-cheer')).not.toBeNull();
    expect(note.className).toContain('piko-note-wiggle');
    act(() => vi.advanceTimersByTime(700));
    expect(container.querySelector('.piko-walk')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Say hi to Piko' }));
    expect(note.className).toContain('piko-note-wiggle-2');
  });

  it('under reduced motion Piko stays still and a tap does nothing', () => {
    stubReducedMotion(true);
    const { container } = render(<PikoIntro />);
    fireEvent.click(screen.getByRole('button', { name: 'Say hi to Piko' }));
    expect(container.querySelector('.piko-walk, .piko-cheer')).toBeNull();
    expect(container.querySelector('[data-piko-note]')!.className).not.toContain('wiggle');
    expect(screen.getByText(PIKO_HELLO, { selector: 'span' })).toBeInTheDocument();
  });
});
