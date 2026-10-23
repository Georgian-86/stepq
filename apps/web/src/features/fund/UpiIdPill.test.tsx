import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UpiIdPill } from './UpiIdPill';

function clipboard(writeText: (s: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

describe('UpiIdPill', () => {
  it('copies the UPI ID and announces "Copied"; the button name stays put', async () => {
    const user = userEvent.setup();
    render(<UpiIdPill />);
    const writeText = vi.fn(() => Promise.resolve());
    clipboard(writeText);
    await user.click(screen.getByRole('button', { name: 'Copy UPI ID' }));
    expect(writeText).toHaveBeenCalledWith('bhakti0parmar1@oksbi');
    expect(screen.getByRole('status')).toHaveTextContent('Copied');
    expect(screen.getByRole('button', { name: 'Copy UPI ID' })).toBeInTheDocument();
  });

  it('says so when the clipboard is blocked', async () => {
    const user = userEvent.setup();
    render(<UpiIdPill />);
    clipboard(() => Promise.reject(new Error('denied')));
    await user.click(screen.getByRole('button', { name: 'Copy UPI ID' }));
    expect(screen.getByRole('status')).toHaveTextContent('Couldn’t copy — select the ID');
  });
});
