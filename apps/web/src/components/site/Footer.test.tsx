import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { site } from '@/content/site';
import { Footer } from './Footer';

describe('Footer', () => {
  it('hides Press kit and every social link that is null', () => {
    render(
      <Footer
        content={{
          ...site,
          socials: { instagram: 'https://instagram.com/stepq', linkedin: null, youtube: null },
        }}
      />,
    );
    const footer = screen.getByRole('contentinfo');
    expect(within(footer).queryByText('Press kit')).not.toBeInTheDocument();
    expect(within(footer).getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'href',
      'https://instagram.com/stepq',
    );
    expect(within(footer).queryByText('LinkedIn')).not.toBeInTheDocument();
    expect(within(footer).queryByText('YouTube')).not.toBeInTheDocument();
  });

  it('links Collaborate to the founder modal with topic partnership, and mails hello@stepq.in', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: 'Collaborate with us' })).toHaveAttribute(
      'href',
      '?modal=founder&topic=partnership',
    );
    expect(screen.getByRole('link', { name: 'hello@stepq.in' })).toHaveAttribute(
      'href',
      'mailto:hello@stepq.in',
    );
    expect(screen.getByText('Chalo, chalte hain.')).toBeInTheDocument();
    expect(screen.getByText('© 2026 StepQ. Made in India.')).toBeInTheDocument();
  });

  it('gives every footer link and the wordmark a hit area of at least 44 px without changing layout', () => {
    render(
      <Footer
        content={{
          ...site,
          socials: { instagram: 'https://instagram.com/stepq', linkedin: null, youtube: null },
        }}
      />,
    );
    const links = within(screen.getByRole('contentinfo')).getAllByRole('link');
    for (const link of links) {
      if (link.getAttribute('aria-label') === 'StepQ home') {
        expect(link.className).toContain('after:h-[44px]');
      } else {
        // 40 px tall per Figma; the pseudo-element extends the target 2 px above and below.
        expect(link.className).toContain('min-h-[40px]');
        expect(link.className).toContain('after:-inset-y-[2px]');
      }
      expect(link.className).toMatch(/(^| )relative( |$)/);
      expect(link.className).toContain("after:content-['']");
    }
  });
});
