import { describe, expect, it } from 'vitest';
import { normalizeUsername, usernameProblem } from './username';

describe('username', () => {
  it('normalizes', () => {
    expect(normalizeUsername('@Riya.Walks')).toBe('riya.walks');
  });
  it('accepts valid', () => {
    expect(usernameProblem('riya.walks')).toBeNull();
  });
  it.each(['ab', '.riya', 'riya.', 'ri..ya', 'riya-walks', 'a'.repeat(21)])('invalid %s', (u) => {
    expect(usernameProblem(u)).toBe('invalid');
  });
  it('reserved', () => {
    expect(usernameProblem('@StepQ')).toBe('reserved');
  });
});
