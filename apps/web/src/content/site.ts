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

export const CONTACT_EMAIL = 'connect@stepq.in';

const PRIVACY_POLICY = `
# Who we are

StepQ is a walking app for India, launching soon on Android and iPhone. This policy explains what this website (stepq.in) collects before launch, why, and what you can ask us to do with it. Questions: [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}).

# What we collect

We only collect what you type into a form on this site:

- **Waitlist:** your name, email, gender, age group, the username you reserve, and where you came from (a referral or campaign link), if any.
- **Join the team:** your name, email, phone, the role, an optional link (such as LinkedIn or a portfolio), why you want to join, and your résumé PDF.
- **Become an ambassador:** your name, email, phone, city, Instagram handle, follower range, college or company, and your plan.
- **Fund StepQ:** your name, phone, the amount, and whether to show your name on the backers wall. Payment happens in your own UPI app; we never see your UPI PIN, bank or card details.
- **Connect with the founder:** your name, email, optional phone, the topic and your message.

To stop abuse we keep a one-way hash of your IP address, never the address itself. We do not use advertising or tracking cookies. We count page visits and button or link clicks anonymously (the page, what was clicked, and the site that linked here), with nothing that identifies you, to see which parts of the site are used. Your browser stores whether you already joined the waitlist, so we do not ask you again.

# Why we use it

- To tell you when StepQ launches and to hold the username you reserved.
- To review applications and reply to you.
- To verify backings and, if you agree, show your first name and initial on the backers wall.
- To answer your message.

We never sell your data and never share it for advertising.

# Where it is stored

Your data is stored in a database hosted by Supabase in Mumbai, India, and the site runs on Vercel. Notification emails are sent to the StepQ team at ${CONTACT_EMAIL}. Only the StepQ team can read your submissions.

# How long we keep it

Waitlist details are kept until launch and for as long as you stay on the list. Applications, backings and messages are kept for up to two years, unless you ask us to delete them sooner.

# Your rights

Under India's Digital Personal Data Protection Act, 2023 you can ask us to see, correct or delete your data, or withdraw your consent, at any time. Email [${CONTACT_EMAIL}](mailto:${CONTACT_EMAIL}) from the address you used and we will act within 30 days.

# Changes

If this policy changes, the new version will be posted on this page.
`;

export const site: SiteContent = {
  roles: ['growth', 'partnerships', 'community', 'product', 'social', 'design'],
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
