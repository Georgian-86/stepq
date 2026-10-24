import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ErrorSummary } from './ErrorSummary';

describe('ErrorSummary', () => {
  it('renders nothing without errors', () => {
    const { container } = render(<ErrorSummary errors={{}} submitCount={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing before a failed submit, even with (blur) errors', () => {
    const { container } = render(
      <ErrorSummary errors={{ email: 'Enter a valid email' }} submitCount={0} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('is a focused alert whose links move focus to the field', async () => {
    const user = userEvent.setup();
    render(
      <>
        <input id="email" aria-label="Email" />
        <ErrorSummary
          errors={{ email: 'Enter a valid email' }}
          labels={{ email: 'Email' }}
          submitCount={1}
        />
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

  it('takes focus only on a new failed submit, not when errors come back after a blur', () => {
    const { rerender } = render(
      <>
        <input aria-label="Name" />
        <ErrorSummary errors={{ name: 'Enter your name' }} submitCount={1} />
      </>,
    );
    expect(screen.getByRole('alert')).toHaveFocus();
    screen.getByLabelText('Name').focus();
    // The person fixes the field (summary goes away), then a blur error brings it back.
    rerender(
      <>
        <input aria-label="Name" />
        <ErrorSummary errors={{}} submitCount={1} />
      </>,
    );
    rerender(
      <>
        <input aria-label="Name" />
        <ErrorSummary errors={{ name: 'Enter your name' }} submitCount={1} />
      </>,
    );
    expect(screen.getByLabelText('Name')).toHaveFocus();
    rerender(
      <>
        <input aria-label="Name" />
        <ErrorSummary errors={{ name: 'Enter your name' }} submitCount={2} />
      </>,
    );
    expect(screen.getByRole('alert')).toHaveFocus();
  });
});
