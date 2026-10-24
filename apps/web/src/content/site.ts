import type { ROLES } from '@stepq/schemas';

export type Role = (typeof ROLES)[number];

/**
 * Content the client still has to supply (spec §12 Q3, Q4). Every unknown is `null`;
 * the UI hides what is missing and `pnpm check:launch` lists it.
 */
export interface SiteContent {
  /**
   * Open roles (W04). `jdSummary` replaces the Figma placeholder text in the open card;
   * `jdUrl` (a PDF) adds the Download row.
   */
  roles: { id: Role; jdUrl: string | null; jdSummary: string | null }[];
  ambassadorEligibility: string | null;
  ambassadorTerms: { title: string; body: string }[] | null;
  socials: { instagram: string | null; linkedin: string | null; youtube: string | null };
  privacyPolicy: string | null;
  contactEmail: 'hello@stepq.in';
  /**
   * Q1: the Fund copy promises a thank-you email, so the form must collect one. Flip to `true`
   * once W06 has an email field; `pnpm check:launch` reports `fundEmailPromise` while false.
   */
  fundCollectsEmail: boolean;
}

export const site: SiteContent = {
  roles: [
    { id: 'marketing', jdUrl: null, jdSummary: null },
    { id: 'design', jdUrl: null, jdSummary: null },
    { id: 'content', jdUrl: null, jdSummary: null },
    { id: 'tech', jdUrl: null, jdSummary: null },
  ],
  ambassadorEligibility: null,
  ambassadorTerms: null,
  socials: { instagram: null, linkedin: null, youtube: null },
  privacyPolicy: null,
  contactEmail: 'hello@stepq.in',
  fundCollectsEmail: false,
};
