import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), call: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ functions: {}, db: {}, initAppCheck: vi.fn() }));

const { WaitlistProvider } = await import('./WaitlistState');
const { WaitlistCard } = await import('./WaitlistCard');

describe('WaitlistCard error summary', () => {
  it('a blur error shows under its field only; the summary waits for a failed submit', async () => {
    const user = userEvent.setup();
    render(
      <WaitlistProvider>
        <WaitlistCard />
      </WaitlistProvider>,
    );
    await user.type(screen.getByLabelText('Email'), 'nope');
    await user.tab();
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByLabelText('Email')).not.toHaveFocus();
    expect(document.activeElement).not.toBe(document.body);
    const focused = document.activeElement;

    await user.click(screen.getByRole('button', { name: 'Join the waitlist' }));
    const summary = screen.getByRole('alert');
    expect(summary).toHaveFocus();
    expect(summary).not.toBe(focused);
  });
});
