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
});
