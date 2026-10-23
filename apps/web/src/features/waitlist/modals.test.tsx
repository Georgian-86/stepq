import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
const call = vi.fn();
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), call }));
vi.mock('@/lib/firebase', () => ({ functions: {}, db: {}, initAppCheck: vi.fn() }));

const { WaitlistProvider } = await import('./WaitlistState');
const { WaitlistModals } = await import('./WaitlistModals');

function renderModals() {
  return render(
    <WaitlistProvider>
      <WaitlistModals />
    </WaitlistProvider>,
  );
}

describe('W02 / W03 modals', () => {
  beforeEach(() => {
    call.mockReset();
    window.sessionStorage.clear();
    window.history.replaceState(null, '', '/');
  });

  it('takes the emailed token out of the URL but keeps W02 open with it', async () => {
    window.history.replaceState(null, '', '/?modal=reserve&token=secret.sig&ref=x');
    renderModals();
    expect(
      await screen.findByRole('dialog', { name: 'Reserve your username' }),
    ).toBeInTheDocument();
    await waitFor(() => expect(window.location.search).toBe('?modal=reserve&ref=x'));
    expect(screen.getByRole('dialog', { name: 'Reserve your username' })).toBeInTheDocument();
  });

  it('never shows W03 from a bare URL (no reservation in this session)', async () => {
    window.sessionStorage.setItem(
      'stepq.waitlist',
      JSON.stringify({ status: 'joined', position: 3, email: 'riya@example.com' }),
    );
    window.history.replaceState(null, '', '/?modal=reserved&u=admin');
    renderModals();
    await waitFor(() => expect(window.location.search).toBe(''));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('admin is yours');
  });

  it('link-mode W03 does not reveal an email stored from an earlier join', async () => {
    window.sessionStorage.setItem(
      'stepq.waitlist',
      JSON.stringify({ status: 'joined', position: 3, email: 'someone@example.com' }),
    );
    window.history.replaceState(null, '', '/?modal=reserve&token=t.s');
    call.mockImplementation(async (name: string) =>
      name === 'checkUsername' ? { available: true } : { username: 'riya.walks' },
    );
    renderModals();
    const input = await screen.findByLabelText('Username');
    const { default: userEvent } = await import('@testing-library/user-event');
    const user = userEvent.setup();
    await user.type(input, 'riya.walks');
    await screen.findByText('Available', {}, { timeout: 2000 });
    await user.click(screen.getByRole('button', { name: 'Reserve @riya.walks' }));
    const w03 = await screen.findByRole('dialog', { name: '@riya.walks is yours' });
    expect(w03).toHaveTextContent("It'll be waiting for you when you sign up.");
    expect(w03).not.toHaveTextContent('someone@example.com');
    expect(call).toHaveBeenCalledWith('reserveUsername', {
      username: 'riya.walks',
      reserveToken: 't.s',
    });
    await act(async () => {});
  });
});
