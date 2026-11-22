import { z } from 'zod';
import { email, personName } from './fields';

/**
 * Verifiable parental consent for StepQ app users aged 13 to 17 (DPDP Act s.9, DPDP Rules
 * rule 10). The app asks for a parent's name and email; the parent answers on stepq.in.
 */
export const requestParentConsentInput = z.object({
  /** The teen's Supabase access token; the server checks it with Supabase Auth. */
  accessToken: z.string().min(20).max(4000),
  parentName: personName,
  parentEmail: email,
});

export const RELATIONSHIPS = ['parent', 'guardian'] as const;

export const respondParentConsentInput = z
  .object({
    token: z.string().min(20).max(200),
    decision: z.enum(['grant', 'decline']),
    parentName: personName,
    relationship: z.enum(RELATIONSHIPS, { errorMap: () => ({ message: 'Pick one' }) }),
    birthYear: z.coerce
      .number({ invalid_type_error: 'Enter the year you were born' })
      .int('Enter the year you were born')
      .min(1900, 'Enter the year you were born'),
  })
  .refine((v) => v.birthYear <= new Date().getFullYear() - 18, {
    message: 'Only an adult (18 or older) can give consent',
    path: ['birthYear'],
  });

export type RequestParentConsentInput = z.infer<typeof requestParentConsentInput>;
export type RespondParentConsentInput = z.infer<typeof respondParentConsentInput>;
