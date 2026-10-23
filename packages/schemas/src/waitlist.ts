import { z } from 'zod';
import { email, honeypot, personName, requestId } from './fields';

export const GENDERS = ['female', 'male', 'non_binary', 'prefer_not'] as const;
export const AGE_GROUPS = ['under_18', '18_24', '25_34', '35_44', '45_60', '60_plus'] as const;

export const GENDER_LABELS: Record<(typeof GENDERS)[number], string> = {
  female: 'Female',
  male: 'Male',
  non_binary: 'Non-binary',
  prefer_not: 'Prefer not to say',
};

export const AGE_LABELS: Record<(typeof AGE_GROUPS)[number], string> = {
  under_18: 'Under 18',
  '18_24': '18–24',
  '25_34': '25–34',
  '35_44': '35–44',
  '45_60': '45–60',
  '60_plus': '60+',
};

export const waitlistInput = z.object({
  name: personName,
  email,
  gender: z.enum(GENDERS, { errorMap: () => ({ message: 'Pick one' }) }),
  ageGroup: z.enum(AGE_GROUPS, { errorMap: () => ({ message: 'Pick one' }) }),
  source: z.string().max(200).optional(),
  website: honeypot,
  requestId,
});

export type WaitlistInput = z.infer<typeof waitlistInput>;
