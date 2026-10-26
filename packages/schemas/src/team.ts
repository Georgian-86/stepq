import { z } from 'zod';
import { email, honeypot, indianMobile, personName, requestId } from './fields';

/** Open roles, from StepQ's job descriptions pack (the mobile app developer role is not listed). */
export const ROLES = ['growth', 'partnerships', 'community', 'product', 'social', 'design'] as const;

export const ROLE_LABELS: Record<(typeof ROLES)[number], string> = {
  growth: 'Growth Marketing Executive',
  partnerships: 'Brand Partnerships & Sponsorship Manager',
  community: 'Community & Campus Growth Manager',
  product: 'Product & Retention Manager',
  social: 'Social Media & Content Intern',
  design: 'Design & Creative Intern',
};

export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

export const teamApplicationInput = z.object({
  name: personName,
  email,
  phone: indianMobile,
  role: z.enum(ROLES, { errorMap: () => ({ message: 'Pick one' }) }),
  link: z
    .string()
    .trim()
    .url('Enter a valid link')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  why: z
    .string({ required_error: 'Tell us why' })
    .trim()
    .min(10, 'Tell us a little more')
    .max(1000, 'Keep it under 1000 characters'),
  resume: z.object({
    fileName: z.string().min(1, 'Attach your resume').max(200),
    base64: z
      .string()
      .min(1, 'Attach your resume')
      .max(Math.ceil((RESUME_MAX_BYTES * 4) / 3) + 4, 'Resume must be under 5 MB'),
  }),
  website: honeypot,
  requestId,
});

export type TeamApplicationInput = z.infer<typeof teamApplicationInput>;
