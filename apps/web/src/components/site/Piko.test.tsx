import { pikoSvg } from '@stepq/brand';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Piko } from './Piko';

/** The SVG string as the DOM serialises it (self-closing tags expand). */
function asDom(svg: string) {
  const div = document.createElement('div');
  div.innerHTML = svg;
  return div.innerHTML;
}

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion: reduce'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe('Piko', () => {
  it('renders the exported SVG for the mood, decorative by default', () => {
    stubReducedMotion(false);
    const { container } = render(<Piko mood="cheer" size={120} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.innerHTML).toBe(asDom(pikoSvg.cheer));
    expect(root).toHaveAttribute('aria-hidden', 'true');
    expect(root.style.width).toBe('120px');
  });

  it('animates the walk loop when motion is allowed', () => {
    stubReducedMotion(false);
    const { container } = render(<Piko mood="happy" size={200} motion="walk" />);
    expect((container.firstElementChild as HTMLElement).className).toMatch(/piko-walk/);
  });

  it('has no animation class under prefers-reduced-motion: reduce', () => {
    stubReducedMotion(true);
    for (const motion of ['walk', 'cheer'] as const) {
      const { container, unmount } = render(<Piko mood="happy" size={120} motion={motion} />);
      const root = container.firstElementChild as HTMLElement;
      expect(root.innerHTML).toBe(asDom(pikoSvg.happy));
      expect(root.className).not.toMatch(/piko-(walk|cheer)/);
      unmount();
    }
  });
});
