import type { ROLES } from '@stepq/schemas';

export type Role = (typeof ROLES)[number];

/**
 * Content the client still has to supply (spec §12 Q3, Q4). Every unknown is `null`;
 * the UI hides what is missing and `pnpm check:launch` lists it.
 */
export interface SiteContent {
  roles: { id: Role; jdUrl: string | null }[];
  ambassadorEligibility: string | null;
  ambassadorTerms: { title: string; body: string }[] | null;
  socials: { instagram: string | null; linkedin: string | null; youtube: string | null };
  privacyPolicy: string | null;
  contactEmail: 'hello@stepq.in';
}

export const site: SiteContent = {
  roles: [
    { id: 'marketing', jdUrl: null },
    { id: 'design', jdUrl: null },
    { id: 'content', jdUrl: null },
    { id: 'tech', jdUrl: null },
  ],
  ambassadorEligibility: null,
  ambassadorTerms: null,
  socials: { instagram: null, linkedin: null, youtube: null },
  privacyPolicy: null,
  contactEmail: 'hello@stepq.in',
};
