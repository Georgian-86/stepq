import { describe, expect, it } from 'vitest';
import { ambassadorInput } from './ambassador';
import { backingInput } from './backing';
import { founderMessageInput } from './founder';
import { teamApplicationInput } from './team';
import { waitlistInput } from './waitlist';

const requestId = '3f2b8c1e-5a4d-4e6f-9b7a-1c2d3e4f5a6b';
const base = { name: 'Riya Sharma', website: '', requestId };

const waitlist = { ...base, email: 'riya@gmail.com', gender: 'female', ageGroup: '18_24' };
const team = {
  ...base,
  email: 'riya@gmail.com',
  phone: '9876543210',
  role: 'design',
  why: 'I love building things.',
  resume: { fileName: 'cv.pdf', base64: 'AAAA' },
};
const ambassador = {
  ...base,
  email: 'riya@gmail.com',
  phone: '9876543210',
  city: 'Pune',
  instagram: '@Riya.Walks',
  followers: '1k_10k',
  collegeOrCompany: 'MIT',
  plan: 'Share with my friends.',
  agreedToTerms: true,
};
const backing = { ...base, phone: '9876543210', amount: 501, showOnWall: true };
const founder = {
  ...base,
  email: 'riya@gmail.com',
  phone: '',
  topic: 'feedback',
  message: 'Loving the idea!',
};

const cases = [
  ['waitlist', waitlistInput, waitlist],
  ['team', teamApplicationInput, team],
  ['ambassador', ambassadorInput, ambassador],
  ['backing', backingInput, backing],
  ['founder', founderMessageInput, founder],
] as const;

describe.each(cases)('%s', (_n, schema, valid) => {
  it('accepts valid input', () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });
  it('rejects filled honeypot', () => {
    expect(schema.safeParse({ ...valid, website: 'x' }).success).toBe(false);
  });
  it('rejects bad requestId', () => {
    expect(schema.safeParse({ ...valid, requestId: 'nope' }).success).toBe(false);
  });
});

describe('waitlist', () => {
  it('rejects unknown gender', () => {
    expect(waitlistInput.safeParse({ ...waitlist, gender: 'x' }).success).toBe(false);
  });
});

describe('team', () => {
  it('requires why', () => {
    const rest: Record<string, unknown> = { ...team };
    delete rest.why;
    const r = teamApplicationInput.safeParse(rest);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(['why']);
  });
  it('rejects unknown role', () => {
    expect(teamApplicationInput.safeParse({ ...team, role: 'sales' }).success).toBe(false);
  });
  it('normalizes phone', () => {
    expect(teamApplicationInput.parse(team).phone).toBe('+919876543210');
  });
});

describe('ambassador', () => {
  it('requires terms', () => {
    const r = ambassadorInput.safeParse({ ...ambassador, agreedToTerms: false });
    expect(r.success).toBe(false);
    if (!r.success)
      expect(r.error.issues[0]?.message).toBe('Please agree to the Terms & Conditions');
  });
  it('strips @ and lower-cases instagram', () => {
    expect(ambassadorInput.parse(ambassador).instagram).toBe('riya.walks');
  });
});

describe('backing', () => {
  it.each([0, 100001, 50.5])('rejects amount %s', (amount) => {
    expect(backingInput.safeParse({ ...backing, amount }).success).toBe(false);
  });
  it('accepts bounds', () => {
    expect(backingInput.safeParse({ ...backing, amount: 1 }).success).toBe(true);
    expect(backingInput.safeParse({ ...backing, amount: 100000 }).success).toBe(true);
  });
});

describe('founder', () => {
  it('phone optional', () => {
    expect(founderMessageInput.parse(founder).phone).toBeUndefined();
  });
});
