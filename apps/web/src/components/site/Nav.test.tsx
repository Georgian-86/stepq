import { render, screen } from '@testing-library/react';
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

  it('menu is a disclosure: aria-expanded toggles, Escape closes and returns focus', async () => {
    const user = userEvent.setup();
    render(<Nav />);
    const menu = screen.getByRole('button', { name: 'Menu' });
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    await user.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    const sheet = document.getElementById(menu.getAttribute('aria-controls')!)!;
    expect(sheet).toBeInTheDocument();
    expect(sheet).not.toHaveAttribute('role', 'dialog');
    expect(sheet).not.toHaveAttribute('aria-modal');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.tab();
    expect(sheet.contains(document.activeElement)).toBe(true);
    await user.keyboard('{Escape}');
    expect(menu).toHaveAttribute('aria-expanded', 'false');
    expect(menu).toHaveFocus();
  });

  it('a tap outside the header closes the menu', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Nav />
        <p>Page content</p>
      </>,
    );
    const menu = screen.getByRole('button', { name: 'Menu' });
    await user.click(menu);
    expect(menu).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByText('Page content'));
    expect(menu).toHaveAttribute('aria-expanded', 'false');
  });

  it('home link has a 44 px hit area', () => {
    render(<Nav />);
    expect(screen.getByRole('link', { name: 'StepQ home' }).className).toContain('min-h-[44px]');
  });
});
