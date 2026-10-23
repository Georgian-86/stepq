import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('loading disables the button, sets aria-busy and swallows a second click', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    function Form() {
      const [loading, setLoading] = useState(false);
      return (
        <Button
          loading={loading}
          onClick={() => {
            handler();
            setLoading(true);
          }}
        >
          Join the waitlist
        </Button>
      );
    }
    render(<Form />);
    const btn = screen.getByRole('button', { name: /join the waitlist/i });
    await user.click(btn);
    await user.click(btn);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });

  it('defaults to type="button" and renders the text variant', () => {
    render(<Button variant="text">Skip for now</Button>);
    const btn = screen.getByRole('button', { name: 'Skip for now' });
    expect(btn).toHaveAttribute('type', 'button');
    expect(btn).not.toHaveAttribute('aria-busy');
    expect(btn.className).toContain('text-deep');
  });
});
