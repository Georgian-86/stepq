import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
const call = vi.fn();
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), call }));

const { FounderModal } = await import('./FounderModal');
const { openModalParam } = await import('@/lib/useModalParam');

beforeEach(() => {
  call.mockReset();
  window.history.replaceState(null, '', '/');
});

describe('FounderModal (W16 → W17)', () => {
  it('opens from ?modal=founder with the topic chip preselected', async () => {
    render(<FounderModal />);
    act(() => openModalParam('founder', { topic: 'press' }));
    const dialog = await screen.findByRole('dialog', { name: 'Connect with the founder' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Press' })).toHaveAttribute('aria-checked', 'true');
  });

  it('ignores an unknown topic', async () => {
    window.history.replaceState(null, '', '/?modal=founder&topic=spam');
    render(<FounderModal />);
    await screen.findByRole('dialog', { name: 'Connect with the founder' });
    for (const r of screen.getAllByRole('radio'))
      expect(r).toHaveAttribute('aria-checked', 'false');
  });

  it('sends without a phone and shows W17 with the first name', async () => {
    const user = userEvent.setup();
    call.mockResolvedValue({ firstName: 'Riya' });
    window.history.replaceState(null, '', '/?modal=founder');
    render(<FounderModal />);
    await screen.findByRole('dialog', { name: 'Connect with the founder' });
    await user.type(screen.getByLabelText('Your name'), 'Riya Sharma');
    await user.type(screen.getByLabelText('Email'), 'riya@example.com');
    await user.click(screen.getByRole('radio', { name: 'Investment' }));
    await user.type(screen.getByLabelText('Message'), 'Can we talk about a seed round?');
    await user.click(screen.getByRole('button', { name: 'Send to the founder' }));

    const sent = await screen.findByRole('dialog', { name: 'Message sent' });
    expect(sent).toHaveTextContent(
      'Thanks, Riya. Your message is on its way to connect@stepq.in. The founder reads every message personally.',
    );
    expect(screen.getByRole('button', { name: 'Back to StepQ' })).toHaveFocus();
    expect(call).toHaveBeenCalledWith(
      'sendFounderMessage',
      expect.objectContaining({ topic: 'investment', name: 'Riya Sharma', website: '' }),
    );
    expect(call.mock.calls[0]![1].phone).toBeUndefined();

    await user.click(screen.getByRole('button', { name: 'Back to StepQ' }));
    await waitFor(() => expect(window.location.search).toBe(''));
  });

  it('a blur error does not show the summary; a failed send does', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/?modal=founder');
    render(<FounderModal />);
    await screen.findByRole('dialog', { name: 'Connect with the founder' });
    await user.type(screen.getByLabelText('Phone (optional)'), '12');
    await user.tab();
    expect(screen.getByText('Enter a valid phone number')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Send to the founder' }));
    expect(screen.getByRole('alert')).toHaveFocus();
    expect(call).not.toHaveBeenCalled();
  });
});
