import { z } from 'zod';
import { email, honeypot, indianMobile, personName, requestId } from './fields';

export const FOLLOWERS = ['under_1k', '1k_10k', '10k_50k', '50k_plus'] as const;

/** Chip labels (W09) and email labels for `followers`. */
export const FOLLOWERS_LABELS: Record<(typeof FOLLOWERS)[number], string> = {
  under_1k: 'Under 1k',
  '1k_10k': '1k–10k',
  '10k_50k': '10k–50k',
  '50k_plus': '50k+',
};

export const ambassadorInput = z.object({
  name: personName,
  email,
  phone: indianMobile,
  city: z
    .string({ required_error: 'Enter your city' })
    .trim()
    .min(2, 'Enter your city')
    .max(60, 'City is too long'),
  instagram: z
    .string({ required_error: 'Enter your Instagram handle' })
    .trim()
    .regex(/^@?[A-Za-z0-9._]{1,30}$/, 'Enter a valid Instagram handle')
    .transform((s) => s.replace(/^@/, '').toLowerCase()),
  followers: z.enum(FOLLOWERS, { errorMap: () => ({ message: 'Pick one' }) }),
  collegeOrCompany: z
    .string({ required_error: 'Enter your college or company' })
    .trim()
    .min(2, 'Enter your college or company')
    .max(120, 'Too long'),
  plan: z
    .string({ required_error: 'Tell us your plan' })
    .trim()
    .min(10, 'Tell us a little more')
    .max(1000, 'Keep it under 1000 characters'),
  agreedToTerms: z.literal(true, {
    errorMap: () => ({ message: 'Please agree to the Terms & Conditions' }),
  }),
  website: honeypot,
  requestId,
});

export type AmbassadorInput = z.infer<typeof ambassadorInput>;
