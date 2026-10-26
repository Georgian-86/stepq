import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
const call = vi.fn();
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), call }));

const { ApiFieldError } = await import('@/lib/api');
const { JoinTeam } = await import('./JoinTeam');

const pdf = () =>
  new File(['%PDF-1.4\n%%EOF\n'], 'Riya_Sharma_Resume.pdf', { type: 'application/pdf' });
const card = (name: RegExp) => screen.getByRole('button', { name });

async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), 'Riya Sharma');
  await user.type(screen.getByLabelText('Email'), 'riya@example.com');
  await user.type(screen.getByLabelText('Contact number'), '9876543210');
  await user.upload(screen.getByLabelText('Resume'), pdf());
  await screen.findByText('PDF, up to 5 MB · uploaded');
  await user.type(screen.getByLabelText('Why StepQ?'), 'I want India to walk more.');
}

beforeEach(() => {
  call.mockReset();
  push.mockReset();
  window.sessionStorage.clear();
});

describe('JoinTeam (W04)', () => {
  it('opening a role selects it; the select does not move the cards', async () => {
    const user = userEvent.setup();
    render(<JoinTeam />);
    const select = screen.getByLabelText('Position applied for');
    expect(card(/Growth Marketing Executive/)).toHaveAttribute('aria-expanded', 'true');
    expect(card(/Growth Marketing Executive/)).toHaveTextContent('Full-time · Growth & Marketing');
    expect(select).toHaveValue('growth');
    // The open card shows the role's job description.
    expect(screen.getByText(/Own StepQ’s user-acquisition experiments/)).toBeVisible();
    expect(screen.getByRole('heading', { name: 'What you will do' })).toBeVisible();

    await user.click(card(/Social Media & Content Intern/));
    expect(select).toHaveValue('social');
    expect(card(/Social Media & Content Intern/)).toHaveAttribute('aria-expanded', 'true');
    expect(card(/Social Media & Content Intern/)).toHaveTextContent('Internship');
    expect(card(/Growth Marketing Executive/)).toHaveAttribute('aria-expanded', 'false');

    await user.selectOptions(select, 'design');
    expect(card(/Social Media & Content Intern/)).toHaveAttribute('aria-expanded', 'true');
    expect(card(/Design & Creative Intern/)).toHaveAttribute('aria-expanded', 'false');

    // Closing the open card keeps the selection.
    await user.click(card(/Social Media & Content Intern/));
    expect(card(/Social Media & Content Intern/)).toHaveAttribute('aria-expanded', 'false');
    expect(card(/Social Media & Content Intern/)).toHaveTextContent('View JD');
    expect(select).toHaveValue('design');
  });

  it('lists the six roles from the job descriptions pack, without the app developer', () => {
    render(<JoinTeam />);
    const options = Array.from(
      (screen.getByLabelText('Position applied for') as HTMLSelectElement).options,
    ).map((o) => o.textContent);
    expect(options).toEqual([
      'Choose a role',
      'Growth Marketing Executive',
      'Brand Partnerships & Sponsorship Manager',
      'Community & Campus Growth Manager',
      'Product & Retention Manager',
      'Social Media & Content Intern',
      'Design & Creative Intern',
    ]);
    expect(screen.queryByText(/App Developer/i)).toBeNull();
  });

  it('sends base64 résumé and a schemed link, then goes to W05', async () => {
    const user = userEvent.setup();
    call.mockResolvedValue({ firstName: 'Riya' });
    render(<JoinTeam />);
    await fill(user);
    await user.type(
      screen.getByLabelText('LinkedIn or portfolio (optional)'),
      'linkedin.com/in/riya',
    );
    await user.click(screen.getByRole('button', { name: 'Submit application' }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/join-the-team/sent?name=Riya&role=growth'),
    );
    const [name, data] = call.mock.calls[0]!;
    expect(name).toBe('submitTeamApplication');
    expect(data).toMatchObject({
      role: 'growth',
      link: 'https://linkedin.com/in/riya',
      resume: { fileName: 'Riya_Sharma_Resume.pdf' },
      website: '',
    });
    expect(atob(data.resume.base64)).toBe('%PDF-1.4\n%%EOF\n');
    expect(window.sessionStorage.getItem('stepq.teamApplication')).toBe('riya@example.com');
  });

  it('shows a server résumé error under the upload row and in the summary', async () => {
    const user = userEvent.setup();
    call.mockRejectedValue(
      new ApiFieldError({
        resume: 'Upload a PDF up to 5 MB',
        phone: 'Enter a 10-digit mobile number',
      }),
    );
    render(<JoinTeam />);
    await fill(user);
    await user.click(screen.getByRole('button', { name: 'Submit application' }));
    const upload = screen.getByLabelText('Resume');
    await waitFor(() => expect(upload).toHaveAttribute('aria-invalid', 'true'));
    expect(document.getElementById('team-resume-error')).toHaveTextContent(
      'Upload a PDF up to 5 MB',
    );
    expect(upload).toHaveAttribute(
      'aria-describedby',
      expect.stringContaining('team-resume-error'),
    );
    expect(screen.getByLabelText('Contact number')).toHaveAttribute('aria-invalid', 'true');
    const summary = screen.getByRole('alert');
    expect(
      within(summary).getByRole('link', { name: 'Resume: Upload a PDF up to 5 MB' }),
    ).toHaveAttribute('href', '#team-resume');
    expect(push).not.toHaveBeenCalled();
  });

  it('refuses a renamed non-PDF with the résumé error and no file row', async () => {
    const user = userEvent.setup();
    render(<JoinTeam />);
    await user.upload(
      screen.getByLabelText('Resume'),
      new File(['hello'], 'fake.pdf', { type: 'application/pdf' }),
    );
    expect(await screen.findByText('Upload a PDF up to 5 MB')).toBeInTheDocument();
    expect(screen.queryByText('fake.pdf')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
