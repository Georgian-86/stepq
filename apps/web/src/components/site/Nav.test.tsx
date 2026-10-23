import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Nav } from './Nav';

describe('Nav', () => {
  it('has the Figma links and a primary waitlist link', () => {
    render(<Nav />);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const name of ['Join the team', 'Fund StepQ', 'Ambassadors', 'Join the waitlist']) {
      expect(nav).toContainElement(screen.getAllByRole('link', { name })[0]!);
    }
    expect(screen.getByRole('link', { name: 'StepQ home' })).toHaveAttribute('href', '/');
  });

  it('menu button toggles the sheet with aria-expanded, Escape closes and returns focus', async () => {
    const user = userEvent.setup();
    render(<Nav />);
    const menu = screen.getByRole('button', { name: 'Menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await user.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    const sheet = screen.getByRole('dialog', { name: 'Menu' });
    await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));
    await user.keyboard('{Escape}');
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveFocus();
  });
});
