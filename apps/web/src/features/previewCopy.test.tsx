import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Preview build: no copy may claim something was saved, sent or emailed.
vi.stubEnv('NEXT_PUBLIC_PREVIEW_MODE', '1');

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
const call = vi.fn();
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), call }));
const detectPlatform = vi.fn(() => 'desktop');
vi.mock('@/lib/platform', () => ({ detectPlatform: () => detectPlatform() }));
vi.mock('./fund/handoff', () => ({ openUpiLink: vi.fn() }));
vi.mock('qrcode', () => ({ default: { toString: async () => '<svg></svg>' } }));

const { PREVIEW_NOTHING_SAVED, PREVIEW_UPI_NOTE } = await import('@/lib/preview');
const { sentMessage: founderSent } = await import('./founder/MessageSent');
const { sentMessage: teamSent } = await import('./team/sent');
const { receivedMessage } = await import('./ambassador/received');
const { thankYouMessage } = await import('./fund/amount');
const { WaitlistProvider } = await import('./waitlist/WaitlistState');
const { WaitlistModals } = await import('./waitlist/WaitlistModals');
const { FounderModal } = await import('./founder/FounderModal');
const { PayModal } = await import('./fund/PayModal');
const { IosUpiSheet } = await import('./fund/IosUpiSheet');
const { FundForm } = await import('./fund/FundForm');

const LINK = 'upi://pay?pa=bhakti0parmar1@oksbi&pn=bhakti%20parmar&aid=uGICAgIDdi9q2dQ&am=251.00';

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(() => {
  call.mockReset();
  window.sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('preview copy', () => {
  it('uses the agreed preview lines', () => {
    expect(PREVIEW_NOTHING_SAVED).toBe('Preview: nothing was saved or emailed.');
    expect(PREVIEW_UPI_NOTE).toBe(
      "Preview: UPI payments made here are real and won't be recorded.",
    );
  });

  it('thank-you sentences (W05, W08, W11, W17) say nothing was saved or emailed', () => {
    expect(founderSent('Riya')).toBe(`Thanks, Riya. ${PREVIEW_NOTHING_SAVED}`);
    expect(teamSent({ name: 'Riya', role: 'design', email: 'riya@example.com' })).toBe(
      `Thanks, Riya. ${PREVIEW_NOTHING_SAVED}`,
    );
    expect(receivedMessage('Riya')).toBe(`Thanks, Riya. ${PREVIEW_NOTHING_SAVED}`);
    expect(thankYouMessage('251')).toBe(`${PREVIEW_NOTHING_SAVED} ${PREVIEW_UPI_NOTE}`);
    for (const s of [founderSent(''), teamSent({ name: null, role: null, email: null })])
      expect(s).not.toMatch(/email(ed)? (to|you)|on its way|reply/i);
  });

  it('W02 for a repeat email does not claim a link was emailed', async () => {
    window.sessionStorage.setItem(
      'stepq.waitlist',
      JSON.stringify({ status: 'existing', position: 3, email: 'riya@example.com' }),
    );
    window.history.replaceState(null, '', '/?modal=reserve');
    render(
      <WaitlistProvider>
        <WaitlistModals />
      </WaitlistProvider>,
    );
    const dialog = await screen.findByRole('dialog', { name: "You're on the list!" });
    expect(dialog).toHaveTextContent(`You're already on the list (#3). ${PREVIEW_NOTHING_SAVED}`);
    expect(dialog).not.toHaveTextContent('emailed you');
  });

  it('W02 after joining does not promise a launch email', async () => {
    window.sessionStorage.setItem(
      'stepq.waitlist',
      JSON.stringify({
        status: 'joined',
        position: 1,
        email: 'riya@example.com',
        reserveToken: 'preview',
      }),
    );
    window.history.replaceState(null, '', '/?modal=reserve');
    render(
      <WaitlistProvider>
        <WaitlistModals />
      </WaitlistProvider>,
    );
    const dialog = await screen.findByRole('dialog', { name: "You're on the list!" });
    expect(dialog).toHaveTextContent(`You're #1. ${PREVIEW_NOTHING_SAVED}`);
    expect(dialog).not.toHaveTextContent("We'll email");
  });

  it('W16 does not say the message is emailed', async () => {
    window.history.replaceState(null, '', '/?modal=founder');
    render(<FounderModal />);
    const dialog = await screen.findByRole('dialog', { name: 'Connect with the founder' });
    expect(dialog).toHaveTextContent(PREVIEW_NOTHING_SAVED);
    expect(dialog).not.toHaveTextContent('emailed to connect@stepq.in');
  });

  it('W07 QR modal and the iOS sheet warn that UPI payments are real', () => {
    const payment = { amount: 251, upiLink: LINK };
    const { unmount } = render(<PayModal payment={payment} onPaid={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveTextContent(PREVIEW_UPI_NOTE);
    unmount();
    render(<IosUpiSheet payment={payment} onPaid={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveTextContent(PREVIEW_UPI_NOTE);
  });

  it('the Android inline state warns that UPI payments are real', async () => {
    detectPlatform.mockReturnValue('android');
    call.mockResolvedValue({ reference: 'ABCD12', amount: 501, upiLink: LINK });
    const user = userEvent.setup();
    render(<FundForm />);
    expect(screen.queryByText(PREVIEW_UPI_NOTE)).toBeNull();
    await user.type(screen.getByLabelText('Name'), 'Riya Sharma');
    await user.type(screen.getByLabelText('Contact number'), '98765 43210');
    await user.click(screen.getByRole('button', { name: /^Pay/ }));
    await screen.findByRole('link', { name: 'Open UPI app' });
    expect(screen.getByText(PREVIEW_UPI_NOTE)).toBeInTheDocument();
  });
});
