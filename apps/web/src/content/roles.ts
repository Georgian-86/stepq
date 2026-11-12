import type { ROLES } from '@stepq/schemas';

type Role = (typeof ROLES)[number];

export interface RoleDescription {
  /** Commitment, e.g. "Part-time / Full-time". */
  type: string;
  area: string;
  location: string;
  duration: string;
  perks: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  /** The 15-minute screening task shortlisted candidates are asked to do. */
  screeningTask: string;
}

/** Job descriptions from "StepQ JD as on 12.11.2026" (Founding Intern Squad hiring pack). */
export const ROLE_DESCRIPTIONS: Record<Role, RoleDescription> = {
  social: {
    type: 'Part-time / Full-time',
    area: 'Social Media & Content',
    location: 'Mumbai (Hybrid / On-site for shoots)',
    duration: 'Minimum 6 months',
    perks: 'Stipend + Official Page Feature + Certificate',
    summary:
      'We are looking for a high-energy, extroverted creator who lives on Instagram Reels and YouTube Shorts to become the creative engine behind StepQ’s pre-launch growth. You will own our daily social presence, shoot raw, relatable content with the founder, and bring mascot Piko’s cheerful energy to life.',
    responsibilities: [
      'Execute StepQ’s daily posting cadence: 1 feed post daily (90-day consistency sprint), including 3 carousels and 3 low-editing, high-hook Reels every week.',
      'Manage daily Instagram Stories on a structured cadence (Mon: 1, Tue: 2, Wed: 3, Thu: 1, Fri: 2, Sat: 3, Sun: 2) using interactive polls, step challenges, and community shoutouts.',
      'Conduct twice-weekly content shoots with the founder to capture candid talking-head clips, startup behind-the-scenes, and walking POVs.',
      'Design clean, on-brand visual posts in Canva/Figma using StepQ’s brand colors, typography, and Piko mascot assets.',
      'Track daily engagement, reply to comments/DMs promptly, and adapt trending Indian audio and Hinglish hooks for StepQ.',
    ],
    requirements: [
      'Extroverted, self-starter mindset with a bias for action (‘get things done’ attitude) and comfort appearing on or behind camera.',
      'Strong grasp of Instagram Reels trends, pacing, hooks, and basic mobile editing tools (CapCut, VN, InShot, Canva).',
      'Open to local travel in Mumbai for founder shoots and weekend community QRuns.',
      'Fluent in conversational English and Hindi/Hinglish copywriting.',
    ],
    screeningTask:
      'Shoot and edit one 15-second vertical walking POV Reel introducing StepQ (‘Chalo, chalte hain’) with on-screen hook text and trending audio.',
  },
  partnerships: {
    type: 'Part-time / Full-time',
    area: 'Partnerships & Creator Outreach',
    location: 'Mumbai / Hybrid',
    duration: 'Minimum 6 months',
    perks: 'Stipend + Performance Incentives + Certificate',
    summary:
      'StepQ’s core promise is ‘Piko pays you to walk.’ We need a relentless, persuasive communicator to build our initial network of micro-creators and onboard partner brands (cafes, footwear, healthy snacks, fitness gear) onto StepQ’s in-app reward wall ahead of launch.',
    responsibilities: [
      'Execute daily outbound prospecting: send at least 20 personalized collaboration DMs to nano/micro creators across Instagram and YouTube every day.',
      'Pitch at least 50 consumer brands, local cafes, and wellness startups daily via Instagram, LinkedIn, and email to secure reward vouchers and sponsor wall placements.',
      'Maintain the StepQ Outreach CRM daily, track response pipelines, and finalize a vetted daily list of confirmed creator collaborations.',
      'Check inbox every morning, manage follow-up sequences, and coordinate closely with the founder for final partnership sign-offs.',
      'Leverage personal and campus networks to unlock warm introductions with emerging D2C brands and student creators.',
    ],
    requirements: [
      'Fearless cold-outreach attitude with persuasive written and verbal communication skills.',
      'High operational discipline: able to hit daily outreach quotas (20 creators + 50 brands) and keep spreadsheets spotless.',
      'Quick decision-making ability and entrepreneurial ownership (‘treat it like your own company’).',
      'Existing network in Mumbai college or creator circles is a strong bonus.',
    ],
    screeningTask:
      'List 5 Indian D2C brands and 5 micro-creators ideal for StepQ, and write a customized 4-line DM pitch for one brand and one creator.',
  },
  community: {
    type: 'Part-time / Flexible',
    area: 'Campus & Community',
    location: 'Mumbai (Field & Campus)',
    duration: '3–6 months',
    perks: 'Stipend + Exclusive StepQ Merch + Certificate',
    summary:
      'Walking is better together. As StepQ’s Community & Campus Lead, you will build our grassroots movement across Mumbai colleges and residential societies: recruiting campus ambassadors, hosting weekend QRuns, and turning early waitlist signups into an active walking tribe.',
    responsibilities: [
      'Recruit, onboard, and manage a squad of Campus Ambassadors across top Mumbai colleges (NMIMS, Mithibai, St. Xavier’s, HR, KC, Jai Hind, IIT-B, etc.).',
      'Plan and host weekly community walking meetups (‘QRuns’) at iconic Mumbai spots (Marine Drive, Carter Road, Shivaji Park, Juhu).',
      'Manage StepQ’s early-access WhatsApp and Instagram broadcast communities, running daily step streaks and leaderboard challenges.',
      'Collect user feedback from early testers and share actionable product insights with the founder.',
      'Coordinate campus distribution of StepQ waitlist QR posters and referral challenges.',
    ],
    requirements: [
      'Active student leader, fest organizer, sports captain, or club head with strong peer influence.',
      'Naturally social, energetic, and excited about fitness, running clubs, or community building.',
      'Available on weekends to lead or co-host local QRun walking sessions.',
    ],
    screeningTask:
      'Outline a 1-page plan to get your first 100 college students to join the StepQ waitlist and show up for a Sunday morning QRun.',
  },
  legal: {
    type: 'Part-time / Project-based (5–8 hrs/week)',
    area: 'Legal & Compliance',
    location: 'Remote / Mumbai',
    duration: '3–6 months (flexible weekly hours)',
    perks: 'Stipend / Project Fee + Letter of Recommendation + Certificate',
    summary:
      'As StepQ prepares to launch user milestone rewards, brand sponsorships, and ambassador programs, we are looking for a detail-oriented law student to help establish clean, startup-ready contracts and compliance documentation.',
    responsibilities: [
      'Draft and review StepQ’s Website & App Terms of Service and Privacy Policy (aligned with India’s Digital Personal Data Protection [DPDP] Act for user step/activity data).',
      'Create standardized Brand Partnership & Sponsor Wall MOUs, Barter Agreements, and Creator Collaboration contracts.',
      'Draft Internship Offer Letters, Non-Disclosure Agreements (NDAs), and Campus Ambassador guidelines.',
      'Assist with basic startup compliance research covering promotional giveaways, reward terms, and IP protection for mascot Piko.',
    ],
    requirements: [
      '4th- or 5th-year LL.B. student (from GLC, NMIMS, MNLU, Symbiosis, or equivalent) with strong drafting skills.',
      'Prior internship experience at a startup, commercial law firm, or IP/technology practice.',
      'Ability to translate legal requirements into clear, plain-English clauses without unnecessary jargon.',
    ],
    screeningTask:
      'Draft a concise 1-paragraph Barter Collaboration clause protecting StepQ when a partner brand provides discount vouchers for app users.',
  },
};
