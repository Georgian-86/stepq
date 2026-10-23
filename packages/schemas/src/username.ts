import { z } from 'zod';

export const RESERVED_USERNAMES: readonly string[] = [
  'stepq',
  'piko',
  'admin',
  'support',
  'help',
  'founder',
  'team',
  'official',
  'bhakti',
  'connect',
  'hello',
  'root',
  'null',
  'undefined',
];

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, '').toLowerCase();
}

export const usernameSchema = z
  .string()
  .regex(/^(?![.])(?!.*[.]$)(?!.*[.]{2})[a-z0-9._]{3,20}$/, 'Use 3–20 letters, numbers, . or _');

export function usernameProblem(raw: string): null | 'invalid' | 'reserved' {
  const u = normalizeUsername(raw);
  if (!usernameSchema.safeParse(u).success) return 'invalid';
  if (RESERVED_USERNAMES.includes(u)) return 'reserved';
  return null;
}
