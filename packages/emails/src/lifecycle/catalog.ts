import type { LifecycleTemplateName, LifecycleTemplateProps } from './index';
import type { MailKind } from './ui';

export type MailCategory = 'account' | 'onboarding' | 'engagement' | 'pro';

export type CatalogEntry<K extends LifecycleTemplateName = LifecycleTemplateName> = {
  name: K;
  category: MailCategory;
  /** transactional: always sent, no unsubscribe. lifecycle: needs opt-in pref + unsubscribe. */
  kind: MailKind;
  /** Who sends it: Supabase Auth itself, or StepQ's own mail queue. */
  sender: 'supabase' | 'stepq';
  /** Preference key that turns it off (lifecycle only). */
  preference?: 'tips' | 'weekly' | 'milestones' | 'social' | 'challenges';
  trigger: string;
  timing: string;
  /** Don't send if any of these are true. */
  skipIf: string[];
  /** Sent to members under 18? Only account mail is. */
  minors: boolean;
  sample: LifecycleTemplateProps[K];
};

const optOut = {
  unsubscribeUrl: 'https://stepq.in/email/unsubscribe?t=SAMPLE',
  preferencesUrl: 'https://stepq.in/email/preferences?t=SAMPLE',
};
const app = 'https://stepq.in/app';

const entries: { [K in LifecycleTemplateName]: Omit<CatalogEntry<K>, 'name'> } = {
  authConfirmSignup: {
    category: 'account',
    kind: 'transactional',
    sender: 'supabase',
    trigger: 'Sign-up with email and password (Supabase Auth "Confirm signup")',
    timing: 'Immediately',
    skipIf: ['Signed up with Google or Apple (already verified)'],
    minors: true,
    sample: { confirmUrl: 'https://stepq.in/auth/confirm?token=SAMPLE' },
  },
  authResetPassword: {
    category: 'account',
    kind: 'transactional',
    sender: 'supabase',
    trigger: 'A03 Forgot password (Supabase Auth "Reset password")',
    timing: 'Immediately',
    skipIf: [],
    minors: true,
    sample: { resetUrl: 'https://stepq.in/auth/reset?token=SAMPLE' },
  },
  authEmailChange: {
    category: 'account',
    kind: 'transactional',
    sender: 'supabase',
    trigger: 'Member changes their email (Supabase Auth "Change email address")',
    timing: 'Immediately, to the new address',
    skipIf: [],
    minors: true,
    sample: {
      confirmUrl: 'https://stepq.in/auth/confirm?token=SAMPLE',
      newEmail: 'riya.new@example.com',
    },
  },
  passwordChanged: {
    category: 'account',
    kind: 'transactional',
    sender: 'stepq',
    trigger: 'auth.users.encrypted_password changes (or Supabase "Password changed" notification)',
    timing: 'Immediately',
    skipIf: [],
    minors: true,
    sample: {
      firstName: 'Riya',
      changedAtIst: '28 Nov 2026, 9:41 pm IST',
      resetUrl: 'https://stepq.in/app/forgot-password',
    },
  },
  accountDeleted: {
    category: 'account',
    kind: 'transactional',
    sender: 'stepq',
    trigger: 'app.delete_my_account() writes app.deleted_accounts',
    timing: 'Immediately (email is read from app.deleted_accounts, the profile is gone)',
    skipIf: [],
    minors: true,
    sample: { firstName: 'Riya', deletedAtIst: '28 Nov 2026, 9:41 pm IST' },
  },
  parentConsentReminder: {
    category: 'account',
    kind: 'transactional',
    sender: 'stepq',
    trigger: 'app.parental_consents still pending',
    timing: 'Once, 4 days after the first request (3 days left)',
    skipIf: ['Parent already answered', 'Account deleted'],
    minors: true,
    sample: {
      parentName: 'Sunita',
      childName: 'Aarav',
      consentUrl: 'https://stepq.in/parent-consent?token=SAMPLE',
      daysLeft: 3,
    },
  },
  parentConsentGranted: {
    category: 'account',
    kind: 'transactional',
    sender: 'stepq',
    trigger: 'Parent grants consent on stepq.in/parent-consent',
    timing: 'Immediately, to the parent (a record of their consent)',
    skipIf: [],
    minors: true,
    sample: { parentName: 'Sunita', childName: 'Aarav' },
  },
  welcome: {
    category: 'onboarding',
    kind: 'transactional',
    sender: 'stepq',
    trigger: 'Profile created (A11 All set) and email confirmed',
    timing: 'Immediately (within 5 minutes)',
    skipIf: ['Under 18 and parent consent still pending (send after consent)'],
    minors: true,
    sample: { firstName: 'Riya', dailyGoal: 8000, openAppUrl: app },
  },
  connectSteps: {
    category: 'onboarding',
    kind: 'lifecycle',
    sender: 'stepq',
    preference: 'tips',
    trigger: 'No app.daily_steps rows 24 h after sign-up',
    timing: 'Day 1, 6:30 pm IST',
    skipIf: ['Any steps synced', 'Under 18'],
    minors: false,
    sample: {
      firstName: 'Riya',
      platform: 'android',
      connectUrl: `${app}/connect-steps`,
      ...optOut,
    },
  },
  findFriends: {
    category: 'onboarding',
    kind: 'lifecycle',
    sender: 'stepq',
    preference: 'tips',
    trigger: 'No accepted app.friendships 3 days after sign-up',
    timing: 'Day 3, 6:30 pm IST',
    skipIf: ['Has a friend or a pending request', 'Under 18'],
    minors: false,
    sample: { firstName: 'Riya', username: 'riya.walks', inviteUrl: `${app}/invite`, ...optOut },
  },
  weeklySummary: {
    category: 'engagement',
    kind: 'lifecycle',
    sender: 'stepq',
    preference: 'weekly',
    trigger: 'Weekly cron over last Monday–Sunday (IST) of app.daily_steps',
    timing: 'Monday 8:00 am IST',
    skipIf: [
      'Zero steps last week (send winBack instead)',
      'Signed up less than 5 days ago',
      'Under 18',
    ],
    minors: false,
    sample: {
      firstName: 'Riya',
      weekLabel: '17 – 23 Nov 2026',
      totalSteps: 61240,
      avgSteps: 8749,
      goalDays: 5,
      streakDays: 12,
      changePct: 14,
      bestDayLabel: 'Saturday',
      bestDaySteps: 13402,
      friendRank: { rank: 2, of: 6 },
      openAppUrl: app,
      isPro: false,
      ...optOut,
    },
  },
  milestone: {
    category: 'engagement',
    kind: 'lifecycle',
    sender: 'stepq',
    preference: 'milestones',
    trigger:
      'First 10K day; streak hits 7, 30, 100, 365; lifetime steps hit 1 lakh, 10 lakh, 1 crore',
    timing: 'Next morning, 8:00 am IST (push goes out at the moment)',
    skipIf: ['Another milestone mail in the last 3 days', 'Under 18'],
    minors: false,
    sample: {
      firstName: 'Riya',
      kind: 'streak',
      value: 30,
      shareUrl: `${app}/share/streak`,
      ...optOut,
    },
  },
  friendRequest: {
    category: 'engagement',
    kind: 'lifecycle',
    sender: 'stepq',
    preference: 'social',
    trigger: 'app.friendships pending for 24 h and addressee has not opened the app',
    timing: 'At most one a day (a digest, not one per request)',
    skipIf: ['Request accepted or declined', 'Opened the app since', 'Under 18'],
    minors: false,
    sample: {
      firstName: 'Riya',
      fromName: 'Kabir Mehta',
      fromUsername: 'kabir.m',
      othersWaiting: 1,
      acceptUrl: `${app}/friends/requests`,
      ...optOut,
    },
  },
  challengeResult: {
    category: 'engagement',
    kind: 'lifecycle',
    sender: 'stepq',
    preference: 'challenges',
    trigger: 'A challenge the member joined (app.challenge_entries) closes',
    timing:
      'Morning after it closes, 9:00 am IST. Winners always get it (reward claim is transactional)',
    skipIf: ['Under 18 (unless they won: then send as transactional)'],
    minors: false,
    sample: {
      firstName: 'Riya',
      challengeName: 'November Monsoon Walk',
      rank: 3,
      participants: 1284,
      steps: 284500,
      reward: 'a ₹500 shopping voucher',
      resultsUrl: `${app}/challenges/results`,
      nextChallengeName: 'December 10K a Day',
      ...optOut,
    },
  },
  winBack: {
    category: 'engagement',
    kind: 'lifecycle',
    sender: 'stepq',
    preference: 'tips',
    trigger: 'No steps synced and no app open for 14 days',
    timing: 'Day 14 and day 30 of inactivity, 6:30 pm IST. Then stop',
    skipIf: ['Came back', 'Already got 2 win-backs this lapse', 'Under 18'],
    minors: false,
    sample: {
      firstName: 'Riya',
      daysAway: 14,
      friendsWalking: 4,
      dailyGoal: 8000,
      openAppUrl: app,
      ...optOut,
    },
  },
  welcomePro: {
    category: 'pro',
    kind: 'transactional',
    sender: 'stepq',
    trigger: 'app.profiles.plan changes free → pro (App Store purchase or admin grant)',
    timing: 'Immediately',
    skipIf: ['Plan was Pro in the last 30 days (a renewal after a lapse: no repeat welcome)'],
    minors: true,
    sample: {
      firstName: 'Riya',
      source: 'app_store',
      renewsOn: '28 Dec 2026',
      openAppUrl: `${app}/pro`,
    },
  },
  proRenewalReminder: {
    category: 'pro',
    kind: 'transactional',
    sender: 'stepq',
    trigger: 'Yearly app.store_subscriptions with auto_renew = true',
    timing: '7 days before expires_at, 10:00 am IST',
    skipIf: ['Monthly plan (Apple already notifies)', 'auto_renew = false'],
    minors: true,
    sample: {
      firstName: 'Riya',
      renewsOn: '28 Nov 2027',
      planLabel: 'StepQ Pro yearly plan',
      manageUrl: 'https://apps.apple.com/account/subscriptions',
    },
  },
  proBillingIssue: {
    category: 'pro',
    kind: 'transactional',
    sender: 'stepq',
    trigger: 'App Store Server Notification DID_FAIL_TO_RENEW (appstore-notifications function)',
    timing: 'Day 0, then day 3 and day 7 if still failing. Then stop',
    skipIf: ['Renewal recovered (DID_RENEW)'],
    minors: true,
    sample: {
      firstName: 'Riya',
      graceEndsOn: '12 Dec 2026',
      manageUrl: 'https://apps.apple.com/account/subscriptions',
    },
  },
  proEnded: {
    category: 'pro',
    kind: 'transactional',
    sender: 'stepq',
    trigger: 'app.profiles.plan changes pro → free (EXPIRED, REFUND, REVOKE or admin)',
    timing: 'Immediately',
    skipIf: ['Account deleted'],
    minors: true,
    sample: { firstName: 'Riya', endedOn: '28 Dec 2026', comeBackUrl: `${app}/pro` },
  },
  qrunHostApproved: {
    category: 'pro',
    kind: 'transactional',
    sender: 'stepq',
    trigger: 'Admin sets app.profiles.qrun_host = true',
    timing: 'Immediately',
    skipIf: [],
    minors: true,
    sample: { firstName: 'Riya', postQrunUrl: `${app}/qruns/new` },
  },
};

export const catalog: CatalogEntry[] = (
  Object.entries(entries) as [LifecycleTemplateName, Omit<CatalogEntry, 'name'>][]
).map(([name, e]) => ({ name, ...e }) as CatalogEntry);
