import type { SiteContent } from '@/content/site';

/** W10 sections (`10:899`–`10:909`): the Figma headings and placeholder lines until StepQ sends the terms. */
export const PLACEHOLDER_TERMS: NonNullable<SiteContent['ambassadorTerms']> = [
  {
    title: '1. Eligibility',
    body: 'Who can become a StepQ ambassador. Final wording to come from StepQ.',
  },
  {
    title: '2. What you agree to do',
    body: 'How you represent StepQ and share it with others. Final wording to come from StepQ.',
  },
  {
    title: '3. Using the StepQ name and logo',
    body: 'Where and how you may use StepQ branding. Final wording to come from StepQ.',
  },
  {
    title: '4. Rewards',
    body: 'What ambassadors receive, if anything, and when. Final wording to come from StepQ.',
  },
  {
    title: '5. Ending the programme',
    body: 'How you or StepQ can end the arrangement. Final wording to come from StepQ.',
  },
];

/** W09 "Who can apply" text (`10:810`) until `ambassadorEligibility` is set. */
export const PLACEHOLDER_ELIGIBILITY =
  'Eligibility criteria and the full terms come from StepQ and will be added here before launch.';
