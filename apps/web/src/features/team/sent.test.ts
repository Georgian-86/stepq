import { describe, expect, it } from 'vitest';
import { sentMessage } from './sent';

describe('sentMessage (W05)', () => {
  it('matches the Figma sentence with every detail', () => {
    expect(sentMessage({ name: 'Riya', role: 'marketing', email: 'riya.sharma@gmail.com' })).toBe(
      'Thanks, Riya. StepQ will review your application for Marketing intern and reply to riya.sharma@gmail.com.',
    );
  });
  it('leaves out a missing name instead of "Thanks, ."', () => {
    expect(sentMessage({ name: '  ', role: 'design', email: 'a@b.in' })).toBe(
      'Thanks. StepQ will review your application for Design intern (UI and brand) and reply to a@b.in.',
    );
  });
  it('ignores an unknown role and a missing email', () => {
    expect(sentMessage({ name: 'Riya', role: 'sales', email: null })).toBe(
      'Thanks, Riya. StepQ will review your application and reply by email.',
    );
  });
});
