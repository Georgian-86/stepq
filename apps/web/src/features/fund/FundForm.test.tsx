import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const call = vi.fn();
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), call }));
vi.mock('@/lib/firebase', () => ({ functions: {}, db: {}, initAppCheck: vi.fn() }));
const detectPlatform = vi.fn(() => 'desktop');
vi.mock('@/lib/platform', () => ({ detectPlatform: () => detectPlatform() }));

const { FundForm } = await import('./FundForm');

const LINK =
  'upi://pay?pa=bhakti0parmar1@oksbi&pn=bhakti%20parmar&aid=uGICAgIDdi9q2dQ&am=251.00&cu=INR&tn=StepQ%20ABCD12';

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Riya Sharma');
  await user.type(screen.getByLabelText('Contact number'), '98765 43210');
}

beforeEach(() => {
  call.mockReset();
  push.mockReset();
  detectPlatform.mockReturnValue('desktop');
});

describe('FundForm (W06)', () => {
  it('starts on ₹501; Other focuses the field; a typed amount deselects the chips', async () => {
    const user = userEvent.setup();
    render(<FundForm />);
    const amount = screen.getByLabelText('Or enter an amount (₹)');
    expect(screen.getByRole('radio', { name: '₹501' })).toHaveAttribute('aria-checked', 'true');
    expect(amount).toHaveValue('501');
    expect(screen.getByLabelText('Show my name on the sponsor wall')).toBeChecked();
    expect(screen.getByRole('button', { name: 'Pay ₹501 with UPI' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '₹1,001' }));
    expect(amount).toHaveValue('1001');
    expect(screen.getByRole('button', { name: 'Pay ₹1,001 with UPI' })).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Other' }));
    expect(amount).toHaveFocus();
    expect(amount).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Pay with UPI' })).toBeInTheDocument();

    await user.type(amount, '251');
    expect(screen.getByRole('button', { name: 'Pay ₹251 with UPI' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '₹251' })).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('radio', { name: 'Other' })).toHaveAttribute('aria-checked', 'true');
  });

  it('refuses 0 without calling the server', async () => {
    const user = userEvent.setup();
    render(<FundForm />);
    await fill(user);
    const amount = screen.getByLabelText('Or enter an amount (₹)');
    await user.clear(amount);
    await user.type(amount, '0');
    await user.click(screen.getByRole('button', { name: 'Pay with UPI' }));
    expect(
      await screen.findByText('Enter an amount', { selector: '#fund-amount-error' }),
    ).toBeVisible();
    expect(amount).toHaveAttribute('aria-invalid', 'true');
    expect(call).not.toHaveBeenCalled();

    // Picking a preset clears the stale error.
    await user.click(screen.getByRole('radio', { name: '₹101' }));
    expect(amount).toHaveAttribute('aria-invalid', 'false');
  });

  it('desktop: records the backing, shows the W07 QR modal, "I\'ve paid" goes to W08', async () => {
    const user = userEvent.setup();
    call.mockResolvedValue({ reference: 'ABCD12', amount: 251, upiLink: LINK });
    render(<FundForm />);
    await fill(user);
    await user.click(screen.getByRole('radio', { name: '₹251' }));
    await user.click(screen.getByRole('button', { name: 'Pay ₹251 with UPI' }));

    expect(call).toHaveBeenCalledTimes(1);
    expect(call.mock.calls[0]![0]).toBe('recordBacking');
    expect(call.mock.calls[0]![1]).toMatchObject({
      name: 'Riya Sharma',
      phone: '+919876543210',
      amount: 251,
      showOnWall: true,
      website: '',
    });
    const dialog = await screen.findByRole('dialog', { name: 'Scan to pay ₹251' });
    expect(within(dialog).getByRole('img', { name: /QR code/ })).toHaveAttribute('data-link', LINK);
    expect(within(dialog).getByText('bhakti0parmar1@oksbi')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: "I've paid" }));
    expect(push).toHaveBeenCalledWith('/fund/thank-you?amount=251');
  });

  it('iOS: shows the M01 sheet with one deep link per app', async () => {
    const user = userEvent.setup();
    detectPlatform.mockReturnValue('ios');
    call.mockResolvedValue({ reference: 'ABCD12', amount: 251, upiLink: LINK });
    render(<FundForm />);
    await fill(user);
    await user.click(screen.getByRole('radio', { name: '₹251' }));
    await user.click(screen.getByRole('button', { name: 'Pay ₹251 with UPI' }));

    const sheet = await screen.findByRole('dialog', { name: 'Pay ₹251 with' });
    const links = within(sheet).getAllByRole('link');
    expect(links.map((a) => a.textContent?.trim())).toEqual([
      'Google Pay',
      'PhonePe',
      'Paytm',
      'BHIM',
      'Other UPI app',
    ]);
    expect(links[0]).toHaveAttribute('href', LINK.replace('upi://pay?', 'gpay://upi/pay?'));
    expect(links[2]).toHaveAttribute('href', LINK.replace('upi://pay?', 'paytmmp://pay?'));
    expect(links[4]).toHaveAttribute('href', LINK);
    await user.click(within(sheet).getByRole('button', { name: "I've paid" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/fund/thank-you?amount=251'));
  });

  it('shows a server field error under the field', async () => {
    const user = userEvent.setup();
    const { ApiFieldError } = await import('@/lib/api');
    call.mockRejectedValue(new ApiFieldError({ phone: 'Enter a 10-digit mobile number' }));
    render(<FundForm />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Pay ₹501 with UPI' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Contact number');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
