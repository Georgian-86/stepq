import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { focusableIn, Modal } from './Modal';

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Talk to the founder</button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="m-title">
        <h2 id="m-title">Connect with the founder</h2>
        <button>First</button>
        <button>Last</button>
      </Modal>
    </>
  );
}

describe('Modal', () => {
  it('traps Tab, closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Talk to the founder' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Connect with the founder' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const first = screen.getByRole('button', { name: 'First' });
    const last = screen.getByRole('button', { name: 'Last' });
    await waitFor(() => expect(first).toHaveFocus());

    await user.tab();
    expect(last).toHaveFocus();
    await user.tab();
    expect(first).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('closes when the overlay is clicked but not when the card is', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Talk to the founder' }));
    await user.click(screen.getByRole('heading', { name: 'Connect with the founder' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(async () => {
      screen.getByTestId('modal-overlay').click();
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('returns focus to the opener even when a child autofocuses, and skips untabbable elements', async () => {
    const user = userEvent.setup();
    function AutoHarness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          <Modal open={open} onClose={() => setOpen(false)} labelledBy="t2">
            <h2 id="t2">Title</h2>
            <input aria-label="Auto" autoFocus />
            <button tabIndex={-1}>Skipped</button>
            <button disabled>Disabled</button>
            <div style={{ display: 'none' }}>
              <button>Hidden</button>
            </div>
            <button>Last</button>
          </Modal>
        </>
      );
    }
    render(<AutoHarness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);
    await waitFor(() => expect(screen.getByLabelText('Auto')).toHaveFocus());
    await user.tab();
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Auto')).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(opener).toHaveFocus();
  });

  it('focusableIn excludes tabindex=-1, disabled and unrendered elements', () => {
    document.body.innerHTML =
      '<div id="r"><button>a</button><button tabindex="-1">b</button><input disabled /><div hidden><a href="#">c</a></div><a href="#">d</a></div>';
    expect(focusableIn(document.getElementById('r')!).map((e) => e.textContent)).toEqual([
      'a',
      'd',
    ]);
  });
});
