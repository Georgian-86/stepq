import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
const call = vi.fn();
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), call }));
vi.mock('@/lib/firebase', () => ({ functions: {}, db: {}, initAppCheck: vi.fn() }));

const { AmbassadorApply } = await import('./AmbassadorApply');

beforeEach(() => {
  call.mockReset();
  push.mockReset();
  window.history.replaceState(null, '', '/ambassadors');
});

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), 'Riya Sharma');
  await user.type(screen.getByLabelText('Email'), 'riya@example.com');
  await user.type(screen.getByLabelText('Contact number'), '98765 43210');
  await user.type(screen.getByLabelText('City'), 'Mumbai');
  await user.type(screen.getByLabelText('Instagram handle'), '@riya.walks');
  await user.click(screen.getByRole('radio', { name: '10k–50k' }));
  await user.type(screen.getByLabelText('College or company'), "St. Xavier's");
  await user.type(screen.getByLabelText('How will you promote StepQ?'), 'Weekly campus walks.');
}

describe('AmbassadorApply (W09 + W10)', () => {
  it('needs the T&C; the T&C modal keeps values and "I agree" ticks the box', async () => {
    const user = userEvent.setup();
    call.mockResolvedValue({ firstName: 'Riya' });
    render(<AmbassadorApply />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Apply to be an ambassador' }));
    expect(screen.getAllByText('Please agree to the Terms & Conditions').length).toBeGreaterThan(0);
    expect(call).not.toHaveBeenCalled();

    await user.click(screen.getByRole('link', { name: 'Terms & Conditions' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ambassador Terms & Conditions' });
    expect(dialog).toHaveTextContent('1. Eligibility');
    expect(dialog).toHaveTextContent(
      'How you or StepQ can end the arrangement. Final wording to come from StepQ.',
    );
    await user.click(screen.getByRole('button', { name: 'I agree' }));
    expect(screen.getByLabelText('Full name')).toHaveValue('Riya Sharma');
    expect(screen.getByLabelText('I agree to the ambassador')).toBeChecked();
    expect(screen.queryByText('Please agree to the Terms & Conditions')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Apply to be an ambassador' }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/ambassadors/received?name=Riya'));
    expect(call).toHaveBeenCalledWith(
      'submitAmbassador',
      expect.objectContaining({ agreedToTerms: true, followers: '10k_50k', city: 'Mumbai' }),
    );
  });
});
