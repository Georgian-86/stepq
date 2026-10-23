import { describe, expect, it } from 'vitest';
import { render } from './index';

const opts = { siteUrl: 'https://stepq.in' };

describe('ambassadorApproved (E01)', () => {
  const props = { firstName: 'Riya', city: 'Mumbai', kitUrl: 'https://stepq.in/kit' };
  it('renders Figma copy and subject', async () => {
    const r = await render('ambassadorApproved', props, opts);
    expect(r.subject).toBe('Congratulations, Riya! You are a StepQ ambassador');
    for (const line of [
      'Congratulations, Riya!',
      'You are now a StepQ ambassador. Thank you for wanting to get more people walking in Mumbai.',
      'What happens next',
      'StepQ will add you to the ambassador group.',
      'You will get your ambassador kit and referral link.',
      'Start your first walking group or QRun.',
      'Open your ambassador kit',
      'Chalo, chalte hain.',
      'Bhakti, StepQ',
      'https://stepq.in/kit',
      'https://stepq.in/email/piko-cheer.png',
    ]) {
      expect(r.html).toContain(line);
    }
    expect(r.html).not.toContain('<svg');
    expect(r.html).not.toContain('Sent automatically');
    expect(r.text.length).toBeGreaterThan(0);
    expect(r.text).toContain('Congratulations, Riya!');
  });
  it('omits the button without kitUrl', async () => {
    const r = await render('ambassadorApproved', { firstName: 'Riya', city: 'Mumbai' }, opts);
    expect(r.html).not.toContain('Open your ambassador kit');
  });
  it('escapes user text', async () => {
    const r = await render(
      'ambassadorApproved',
      { firstName: '<script>x</script>', city: 'A&B' },
      opts,
    );
    expect(r.html).not.toContain('<script>x');
    expect(r.html).toContain('&lt;script&gt;');
  });
});

describe('founderMessage (E03)', () => {
  const props = {
    name: 'Riya Sharma',
    email: 'riya@example.com',
    phone: '+91 98765 43210',
    topicLabel: 'Partnership',
    message: 'We run a 2,000-student college in Pune. Can we talk?',
  };
  it('renders Figma copy and subject', async () => {
    const r = await render('founderMessage', props, opts);
    expect(r.subject).toBe('New message from Riya Sharma · Partnership');
    for (const line of [
      'New message for the founder',
      'Riya Sharma wrote to you from the StepQ website.',
      'Their details',
      'Email: riya@example.com',
      'Phone: +91 98765 43210',
      'Topic: Partnership',
      'Reply to Riya',
      'mailto:riya@example.com',
      'We run a 2,000-student college in Pune. Can we talk?',
    ]) {
      expect(r.html).toContain(line);
    }
    expect(r.html).not.toContain('<svg');
    expect(r.text.length).toBeGreaterThan(0);
  });
  it('omits phone when absent and escapes the message', async () => {
    const r = await render(
      'founderMessage',
      { ...props, phone: undefined, message: '<img src=x onerror=1>' },
      opts,
    );
    expect(r.html).not.toContain('Phone:');
    expect(r.html).not.toContain('<img src=x');
  });
});

describe('notification templates', () => {
  const team = {
    name: 'Asha',
    email: 'asha@example.com',
    phone: '+919876543210',
    roleLabel: 'Designer',
    why: 'Because walking.',
    resumeUrl: 'https://files.example/resume.pdf',
  };
  it('teamApplicationAlert: http link is clickable', async () => {
    const r = await render('teamApplicationAlert', { ...team, link: 'https://asha.dev' }, opts);
    expect(r.subject).toBe('New team application: Asha · Designer');
    expect(r.html).toContain('href="https://asha.dev"');
    expect(r.html).toContain('https://files.example/resume.pdf');
    expect(r.html).not.toContain('<svg');
    expect(r.text.length).toBeGreaterThan(0);
  });
  it('teamApplicationAlert: non-http link is plain text, never an href', async () => {
    const r = await render('teamApplicationAlert', { ...team, link: 'javascript:alert(1)' }, opts);
    expect(r.html).not.toContain('href="javascript:');
    expect(r.html).toContain('javascript:alert(1)');
  });
  it('ambassadorAlert', async () => {
    const r = await render(
      'ambassadorAlert',
      {
        name: 'Riya Sharma',
        email: 'riya@example.com',
        phone: '+919876543210',
        city: 'Mumbai',
        instagram: 'riya.walks',
        instagramUrl: 'https://instagram.com/riya.walks',
        followersLabel: '1k–10k',
        collegeOrCompany: 'St Xavier',
        plan: 'Weekend walks.',
        approveUrl: 'https://stepq.in/approve?t=1',
      },
      opts,
    );
    expect(r.subject).toBe('New ambassador application: Riya Sharma · Mumbai');
    for (const t of [
      'Mumbai',
      '@riya.walks',
      '1k–10k',
      'St Xavier',
      'Weekend walks.',
      'Approve Riya',
    ])
      expect(r.html).toContain(t);
    expect(r.html).toContain('href="https://stepq.in/approve?t=1"');
    expect(r.html).toContain('href="https://instagram.com/riya.walks"');
    expect(r.html).not.toContain('Open resume');
    expect(r.html).not.toContain('&#10003;');
  });
  it('backingAlert', async () => {
    const r = await render(
      'backingAlert',
      {
        name: 'Ravi',
        phone: '+919812345678',
        amount: 501,
        reference: 'REF123',
        createdAtIst: '23 Oct 2026, 6:30 pm IST',
        showOnWall: true,
        verifyUrl: 'https://stepq.in/verify?t=abc',
      },
      opts,
    );
    expect(r.subject).toBe('New backing: ₹501 from Ravi');
    expect(r.html).toContain('₹501');
    expect(r.html).toContain('https://stepq.in/verify?t=abc');
    expect(r.html).toContain('REF123');
    expect(r.html).toContain('23 Oct 2026, 6:30 pm IST');
  });
  it('reserveLink', async () => {
    const r = await render(
      'reserveLink',
      { firstName: 'Riya', position: 42, reserveUrl: 'https://stepq.in/reserve?t=z' },
      opts,
    );
    expect(r.subject).toContain('Riya');
    expect(r.html).toContain('https://stepq.in/reserve?t=z');
    expect(r.html).toContain('42');
    expect(r.html).toContain('https://stepq.in/email/piko-happy.png');
  });
});
