import { z } from 'zod';

export const personName = z
  .string({ required_error: 'Enter your name' })
  .trim()
  .min(2, 'Enter your name')
  .max(80, 'Name is too long');

export const email = z
  .string({ required_error: 'Enter a valid email' })
  .trim()
  .toLowerCase()
  .email('Enter a valid email')
  .max(254, 'Enter a valid email');

const MOBILE_ERROR = 'Enter a 10-digit mobile number';

export const indianMobile = z
  .string({ required_error: MOBILE_ERROR })
  .transform((raw) => {
    const s = raw.replace(/[\s\-()]/g, '');
    if (s.startsWith('+91')) return s.slice(3);
    if (s.startsWith('91') && s.length === 12) return s.slice(2);
    if (s.startsWith('0') && s.length === 11) return s.slice(1);
    return s;
  })
  .refine((s) => /^[6-9]\d{9}$/.test(s), MOBILE_ERROR)
  .transform((s) => `+91${s}`);

export const optionalPhone = z
  .string()
  .optional()
  .transform((raw) => raw?.replace(/[\s\-()]/g, '') || undefined)
  .refine((s) => s === undefined || /^\+?\d{7,15}$/.test(s), 'Enter a valid phone number');

export const honeypot = z.literal('');

export const requestId = z
  .string({ required_error: 'Missing request id' })
  .uuid('Invalid request id');
