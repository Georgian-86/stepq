import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { site } from '@/content/site';
import { PrivacyPolicy } from './PrivacyPolicy';

describe('PrivacyPolicy', () => {
  it('shows the coming-soon notice while the policy is null', () => {
    render(<PrivacyPolicy content={{ ...site, privacyPolicy: null }} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Policy coming soon');
    expect(screen.queryByRole('navigation', { name: 'On this page' })).toBeNull();
  });

  it('renders the Markdown with a contents list', () => {
    render(
      <PrivacyPolicy
        content={{
          ...site,
          privacyPolicy: '# What we collect\n\nName.\n\n# Contact\n\nHi <b>x</b>',
        }}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'What we collect' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Contact' })).toHaveAttribute('href', '#contact');
    expect(screen.queryByText('Policy coming soon')).toBeNull();
    expect(document.querySelector('b')).toBeNull();
  });
});
