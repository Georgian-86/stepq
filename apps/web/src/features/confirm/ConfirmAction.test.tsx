import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const call = vi.fn();
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), call }));

const { ConfirmAction } = await import('./ConfirmAction');

const SUMMARY = 'Approve Riya Sharma (Mumbai) as an ambassador?';

beforeEach(() => {
  call.mockReset();
  window.history.replaceState(null, '', '/confirm?token=tok.sig');
});

describe('/confirm', () => {
  it('drops the token from the URL, describes on load and acts only on Confirm', async () => {
    const user = userEvent.setup();
    call.mockImplementation(async (name: string) =>
      name === 'describeAction'
        ? { kind: 'approveAmbassador', summary: SUMMARY, done: false }
        : { done: true },
    );
    render(<ConfirmAction />);
    expect(window.location.search).toBe('');
    expect(await screen.findByText(SUMMARY)).toBeInTheDocument();
    expect(call).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith('describeAction', { token: 'tok.sig' });

    await user.dblClick(screen.getByRole('button', { name: 'Confirm' }));
    expect(await screen.findByRole('heading', { name: 'Done' })).toBeInTheDocument();
    expect(call.mock.calls.filter(([n]) => n === 'confirmAction')).toEqual([
      ['confirmAction', { token: 'tok.sig' }],
    ]);
  });

  it('shows "Already done" without a Confirm button when the action is done', async () => {
    call.mockResolvedValue({ kind: 'verifyBacking', summary: SUMMARY, done: true });
    render(<ConfirmAction />);
    expect(await screen.findByRole('heading', { name: 'Already done' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
  });

  it('shows the server message for a bad or expired token', async () => {
    call.mockRejectedValue(new Error('This link is no longer valid.'));
    render(<ConfirmAction />);
    expect(await screen.findByText('This link is no longer valid.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirm' })).toBeNull();
  });

  it('without a token calls nothing and says the link is not valid', async () => {
    window.history.replaceState(null, '', '/confirm');
    render(<ConfirmAction />);
    expect(await screen.findByText('This link is not valid.')).toBeInTheDocument();
    expect(call).not.toHaveBeenCalled();
  });

  it('keeps the Confirm button after a failed confirm, with the error', async () => {
    const user = userEvent.setup();
    call.mockImplementation(async (name: string) => {
      if (name === 'describeAction')
        return { kind: 'verifyBacking', summary: SUMMARY, done: false };
      throw new Error('Too many tries. Please wait a few minutes.');
    });
    render(<ConfirmAction />);
    await user.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Too many tries. Please wait a few minutes.',
      ),
    );
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeEnabled();
  });
});
