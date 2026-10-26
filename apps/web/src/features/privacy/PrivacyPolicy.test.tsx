import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { site } from '@/content/site';
import { PrivacyPolicy } from './PrivacyPolicy';

describe('PrivacyPolicy', () => {
  it('shows StepQ’s policy with a contents list and the contact address', () => {
    render(<PrivacyPolicy />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy policy' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'On this page' });
    expect(nav).toHaveTextContent('What we collect');
    expect(nav).toHaveTextContent('Your rights');
    expect(screen.getAllByRole('link', { name: 'connect@stepq.in' })[0]).toHaveAttribute(
      'href',
      'mailto:connect@stepq.in',
    );
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
    expect(document.querySelector('b')).toBeNull();
  });
});
