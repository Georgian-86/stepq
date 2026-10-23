import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ErrorSummary } from './ErrorSummary';

describe('ErrorSummary', () => {
  it('renders nothing without errors', () => {
    const { container } = render(<ErrorSummary errors={{}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('is a focused alert whose links move focus to the field', async () => {
    const user = userEvent.setup();
    render(
      <>
        <input id="email" aria-label="Email" />
        <ErrorSummary errors={{ email: 'Enter a valid email' }} labels={{ email: 'Email' }} />
      </>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toHaveFocus();
    const link = screen.getByRole('link', { name: 'Email: Enter a valid email' });
    expect(link).toHaveAttribute('href', '#email');
    Element.prototype.scrollIntoView ??= () => {};
    await user.click(link);
    expect(screen.getByLabelText('Email')).toHaveFocus();
  });
});
