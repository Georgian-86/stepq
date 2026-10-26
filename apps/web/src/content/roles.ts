import type { ROLES } from '@stepq/schemas';

type Role = (typeof ROLES)[number];

export interface RoleDescription {
  type: 'Full-time' | 'Internship';
  area: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  howToApply: string;
}

/** Job descriptions from "StepQ Job Descriptions & Internship Roles" (client PDF). */
export const ROLE_DESCRIPTIONS: Record<Role, RoleDescription> = {
  growth: {
    type: 'Full-time',
    area: 'Growth & Marketing',
    summary:
      'Own StepQ’s user-acquisition experiments and growth funnel, helping turn awareness into genuine app registrations, first completed walks, referrals, and repeat activity.',
    responsibilities: [
      'Plan and execute growth campaigns across digital channels, referral loops, community activations, and relevant partnerships.',
      'Build and test acquisition funnels from campaign impression through install, registration, first qualifying walk, and repeat use.',
      'Develop campaign briefs, landing-page ideas, referral offers, and experiments to improve conversion.',
      'Monitor campaign performance and prepare a concise weekly dashboard covering installs, activated users, retention, and acquisition cost where tracking is available.',
      'Work with content, design, campus growth, and product teams to coordinate launches and experiments.',
      'Research competitor activity and audience insights; recommend practical, budget-conscious growth opportunities.',
      'Maintain responsible marketing practices: no misleading claims about earnings, rewards, health benefits, or guaranteed outcomes.',
    ],
    requirements: [
      'Experience in digital marketing, growth, performance marketing, or a relevant project; strong fresh graduates may apply.',
      'Comfort with spreadsheets and interpreting campaign metrics; familiarity with analytics or attribution tools is an advantage.',
      'Strong communication, experimentation, organisation, and problem-solving skills.',
      'Ability to manage multiple experiments and report results clearly.',
    ],
    howToApply:
      'Share your CV and a short example of a campaign, growth experiment, or project you have worked on.',
  },
  partnerships: {
    type: 'Full-time',
    area: 'Business Development & Partnerships',
    summary:
      'Build commercial and promotional partnerships that help StepQ offer relevant rewards, sponsor-led walking challenges, and mutually beneficial brand campaigns.',
    responsibilities: [
      'Identify and approach potential partners such as fitness and wellness brands, sports retailers, cafés, gyms, colleges, local businesses, and consumer brands.',
      'Create partnership proposals, sponsorship packages, campaign concepts, and clear value propositions for prospective partners.',
      'Negotiate campaign scope, deliverables, timelines, reward contributions, and commercial terms within approved limits.',
      'Build and maintain a structured pipeline of prospects, contacts, follow-ups, proposals, and outcomes.',
      'Coordinate with marketing and product teams to deliver partner campaigns and report agreed results.',
      'Maintain professional partner relationships and identify renewal, cross-promotion, and upsell opportunities.',
      'Ensure all offers, sponsorship claims, and reward terms are accurate and approved before publication.',
    ],
    requirements: [
      'Experience in sales, business development, sponsorships, account management, or partnerships is preferred.',
      'Strong pitching, negotiation, written communication, and relationship-building skills.',
      'Able to prepare clear presentations and track a sales pipeline in a spreadsheet or CRM.',
      'Comfortable with outreach, follow-ups, and working toward measurable targets.',
    ],
    howToApply:
      'Share your CV and, if available, an example of a pitch, partnership, or sales project.',
  },
  community: {
    type: 'Full-time',
    area: 'Community & User Growth',
    summary:
      'Grow StepQ through college communities, campus ambassadors, local groups, and recurring walking challenges that encourage genuine participation.',
    responsibilities: [
      'Build and manage a network of campus ambassadors and student representatives.',
      'Create campus launch plans, walking challenges, leaderboard activities, and community engagement calendars.',
      'Develop relationships with college clubs, societies, student councils, sports groups, and relevant local communities.',
      'Provide ambassadors with clear onboarding materials, campaign guidelines, approved creatives, and tracking links or codes where available.',
      'Track registrations, first walks, challenge participation, referrals, and ongoing activity by campus.',
      'Gather user feedback and share recurring issues, feature requests, and engagement ideas with the product team.',
      'Maintain respectful community standards and protect users’ personal information; avoid spam, fake sign-ups, or unapproved incentives.',
    ],
    requirements: [
      'Experience in community building, student engagement, events, field marketing, or ambassador programmes is preferred.',
      'Strong people skills, coordination, communication, and event-planning ability.',
      'Willingness to engage with colleges and communities, including occasional on-site activities if required.',
      'Comfort with spreadsheets, basic reporting, and coordinating multiple representatives.',
    ],
    howToApply:
      'Share your CV and briefly describe a community, campus, or event you have helped organise.',
  },
  product: {
    type: 'Full-time',
    area: 'Product Management & User Retention',
    summary:
      'Help users form a lasting walking habit by improving StepQ’s onboarding, daily engagement, challenge experience, and return rate.',
    responsibilities: [
      'Map the user journey from first app visit to registration, first walk, repeat use, and long-term retention.',
      'Analyse funnel and cohort data to identify drop-off points and opportunities to improve activation.',
      'Plan and prioritise experiments involving reminders, streaks, challenges, milestones, rewards, and social features.',
      'Collect and synthesise user feedback, support themes, usability findings, and competitor insights.',
      'Write product requirements, user stories, acceptance criteria, and release notes in collaboration with engineering and design.',
      'Define success metrics before experiments and assess results without overstating causality.',
      'Work with marketing and partnerships to ensure reward mechanics and campaign promises match the actual product experience.',
    ],
    requirements: [
      'Experience in product management, UX research, customer experience, analytics, or a relevant product project is preferred.',
      'Strong analytical thinking, prioritisation, communication, and user-empathy skills.',
      'Comfort with spreadsheets and funnel or cohort analysis; product analytics experience is an advantage.',
      'Ability to turn ambiguous feedback into clear, testable product improvements.',
    ],
    howToApply:
      'Share your CV and a short product case study or idea for improving retention in a consumer mobile app.',
  },
  social: {
    type: 'Internship',
    area: 'Marketing & Communications',
    summary:
      'Create engaging, platform-native content that introduces StepQ, brings Piko to life, and encourages people to try walking challenges and discover the app.',
    responsibilities: [
      'Research trends and plan a weekly content calendar for platforms such as Instagram and other channels used by StepQ.',
      'Develop ideas and drafts for Reels, short videos, carousels, stories, captions, memes, and campaign posts.',
      'Coordinate with the design intern to create consistent content around Piko, walking habits, challenges, and app features.',
      'Help collect user-generated content and testimonials only with clear permission and accurate context.',
      'Schedule approved content and maintain a record of posts, reach, shares, saves, profile visits, and attributed installs where available.',
      'Respond to routine comments or messages using approved guidelines and escalate sensitive or technical issues.',
      'Use only licensed or authorised media and avoid misleading health, income, or reward claims.',
    ],
    requirements: [
      'Interest in social media, storytelling, trends, fitness, lifestyle, or creator culture.',
      'Good writing and communication skills; basic short-form video editing is an advantage.',
      'Creative, dependable, open to feedback, and able to meet agreed deadlines.',
      'A portfolio, sample posts, or personal content account is welcome but not mandatory.',
    ],
    howToApply:
      'Share your CV and 2–3 sample content ideas for StepQ. A short creative task may be used during selection.',
  },
  design: {
    type: 'Internship',
    area: 'Graphic Design & Visual Communication',
    summary:
      'Create clear, energetic, brand-consistent visuals for StepQ’s app, social channels, campaigns, and Piko mascot.',
    responsibilities: [
      'Design social posts, story templates, banners, app promotional creatives, challenge cards, badges, and campaign assets.',
      'Help maintain a consistent visual system for typography, colours, layout, and use of the StepQ identity.',
      'Develop creative variations for marketing experiments and adapt designs to different platform sizes.',
      'Collaborate with the content, growth, and product teams to translate briefs into effective visual assets.',
      'Support Piko-related creative work, including expressions, stickers, and simple illustrations where skills allow.',
      'Organise editable source files and exports with clear naming and version control.',
      'Use authorised fonts, images, illustrations, and other assets; follow accessibility and readability basics.',
    ],
    requirements: [
      'Interest or experience in graphic design, visual communication, or digital content.',
      'Familiarity with Canva, Figma, Adobe tools, or comparable design software.',
      'Good attention to detail, layout, typography, and consistency.',
      'Willingness to iterate based on feedback and work to agreed deadlines.',
    ],
    howToApply:
      'Share a portfolio or 3–5 design samples. Student and beginner portfolios are welcome.',
  },
};
