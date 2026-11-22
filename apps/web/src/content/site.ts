import { CONTACT_EMAIL, PRIVACY_POLICY } from './legal';
import type { ROLES } from '@stepq/schemas';

export type Role = (typeof ROLES)[number];

/** Site copy that StepQ owns: contact, socials, ambassador terms, privacy policy. */
export interface SiteContent {
  /** Open roles (W04), in display order; their job descriptions are in `roles.ts`. */
  roles: Role[];
  ambassadorEligibility: string;
  ambassadorTerms: { title: string; body: string }[];
  /** A null link is hidden. */
  socials: { instagram: string | null; linkedin: string | null; youtube: string | null };
  /** Markdown, rendered on /privacy. */
  privacyPolicy: string;
  contactEmail: string;
}

export { CONTACT_EMAIL };

export const site: SiteContent = {
  roles: ['social', 'partnerships', 'community', 'legal'],
  ambassadorEligibility:
    'Anyone 18 or older who lives in India and can bring people together: a college, an office, a housing society or a neighbourhood group. A big following helps, but is not required.',
  ambassadorTerms: [
    {
      title: '1. Eligibility',
      body: 'You must be 18 or older and live in India. Applying does not guarantee a place: StepQ reviews every application and confirms by email.',
    },
    {
      title: '2. What you agree to do',
      body: 'Represent StepQ honestly. Do not make claims about earnings, rewards or health benefits that StepQ has not approved, do not send spam, and do not create fake sign-ups.',
    },
    {
      title: '3. Using the StepQ name and logo',
      body: 'Use the StepQ name, logo and Piko only in the materials StepQ gives you or approves. You are not an employee or legal representative of StepQ and cannot sign anything on its behalf.',
    },
    {
      title: '4. Rewards',
      body: 'The ambassador role is voluntary. Any rewards, merchandise or perks are optional, decided by StepQ and confirmed to you in writing before they apply.',
    },
    {
      title: '5. Ending the programme',
      body: `You or StepQ can end the arrangement at any time by email to ${CONTACT_EMAIL}. When it ends, stop using StepQ branding.`,
    },
  ],
  socials: { instagram: null, linkedin: null, youtube: null },
  privacyPolicy: PRIVACY_POLICY,
  contactEmail: CONTACT_EMAIL,
};
