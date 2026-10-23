import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import { ApiFieldError } from './api';
import { useZodForm } from './useZodForm';

vi.mock('./firebase', () => ({ functions: {}, initAppCheck: vi.fn() }));

const schema = z.object({
  name: z.string({ required_error: 'Enter your name' }).trim().min(2, 'Enter your name'),
  email: z
    .string({ required_error: 'Enter a valid email' })
    .trim()
    .toLowerCase()
    .email('Enter a valid email'),
  website: z.literal(''),
  requestId: z.string().uuid(),
});

function Form({ send }: { send: (data: z.output<typeof schema>) => Promise<void> }) {
  const form = useZodForm(schema);
  return (
    <form onSubmit={form.submit(send)} noValidate>
      <label>
        Name
        <input {...form.field('name')} />
      </label>
      <span data-testid="name-error">{form.errors.name}</span>
      <label>
        Email
        <input {...form.field('email')} />
      </label>
      <span data-testid="email-error">{form.errors.email}</span>
      <span data-testid="form-error">{form.formError}</span>
      <button type="submit" disabled={form.submitting}>
        Send
      </button>
    </form>
  );
}

describe('useZodForm', () => {
  it('validates a field on blur', async () => {
    const user = userEvent.setup();
    render(<Form send={vi.fn()} />);
    await user.type(screen.getByLabelText('Email'), 'nope');
    expect(screen.getByTestId('email-error')).toHaveTextContent('');
    await user.tab();
    expect(screen.getByTestId('email-error')).toHaveTextContent('Enter a valid email');
    expect(screen.getByTestId('name-error')).toHaveTextContent('');
  });

  it('shows every error on submit without calling send', async () => {
    const user = userEvent.setup();
    const send = vi.fn();
    render(<Form send={send} />);
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(send).not.toHaveBeenCalled();
    expect(screen.getByTestId('name-error')).toHaveTextContent('Enter your name');
    expect(screen.getByTestId('email-error')).toHaveTextContent('Enter a valid email');
  });

  it('keeps one requestId across retries and renews it only after success', async () => {
    const user = userEvent.setup();
    const ids: string[] = [];
    const send = vi
      .fn()
      .mockImplementationOnce(async (d: { requestId: string }) => {
        ids.push(d.requestId);
        throw new Error('network');
      })
      .mockImplementation(async (d: { requestId: string }) => {
        ids.push(d.requestId);
      });
    render(<Form send={send} />);
    await user.type(screen.getByLabelText('Name'), 'Riya');
    await user.type(screen.getByLabelText('Email'), ' Riya@Gmail.com ');
    const btn = screen.getByRole('button', { name: 'Send' });
    await user.click(btn);
    await waitFor(() => expect(screen.getByTestId('form-error')).not.toBeEmptyDOMElement());
    await user.click(btn);
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(btn).toBeEnabled());
    await user.click(btn);
    await waitFor(() => expect(send).toHaveBeenCalledTimes(3));
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
    expect(ids[1]).toBe(ids[0]);
    expect(ids[2]).not.toBe(ids[1]);
    expect(send.mock.calls[0]![0]).toMatchObject({
      name: 'Riya',
      email: 'riya@gmail.com',
      website: '',
    });
  });

  it('puts ApiFieldError fields on the matching inputs', async () => {
    const user = userEvent.setup();
    const send = vi.fn().mockRejectedValue(new ApiFieldError({ email: 'Already used' }));
    render(<Form send={send} />);
    await user.type(screen.getByLabelText('Name'), 'Riya');
    await user.type(screen.getByLabelText('Email'), 'riya@gmail.com');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    await waitFor(() =>
      expect(screen.getByTestId('email-error')).toHaveTextContent('Already used'),
    );
  });
});
