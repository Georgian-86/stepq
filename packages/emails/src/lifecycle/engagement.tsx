import { Layout } from '../Layout';
import {
  Body,
  Button1,
  Callout,
  fmt,
  H,
  H3,
  MemberFooter,
  Signoff,
  Small,
  Stats,
  type OptOut,
} from './ui';

/** Engagement: the weekly summary, milestones, friend requests, results and win-back. */

type Base = { siteUrl: string };

// ---------------------------------------------------------------------------------------------
// Weekly summary (Monday morning, IST)
// ---------------------------------------------------------------------------------------------
export type WeeklySummaryProps = {
  firstName: string;
  weekLabel: string;
  totalSteps: number;
  avgSteps: number;
  goalDays: number;
  streakDays: number;
  /** Percent change from the week before; omit for the first week. */
  changePct?: number;
  bestDayLabel: string;
  bestDaySteps: number;
  /** Rank among friends this week, if they have any. */
  friendRank?: { rank: number; of: number };
  openAppUrl: string;
  isPro: boolean;
} & OptOut;
export const weeklySummarySubject = (p: WeeklySummaryProps) =>
  `${p.firstName}, you walked ${fmt(p.totalSteps)} steps last week`;
export function WeeklySummary(p: WeeklySummaryProps & Base) {
  const up = (p.changePct ?? 0) >= 0;
  const change =
    p.changePct === undefined
      ? 'Your first week on StepQ. Next week you can see how you compare.'
      : `That's ${Math.abs(Math.round(p.changePct))}% ${up ? 'more' : 'less'} than the week before.`;
  return (
    <Layout
      siteUrl={p.siteUrl}
      mood={p.goalDays >= 5 ? 'cheer' : 'happy'}
      variant={p.isPro ? 'pro' : 'default'}
      preview={`${p.goalDays} of 7 goal days and a ${p.streakDays}-day streak.`}
      footer={
        <MemberFooter
          kind="lifecycle"
          siteUrl={p.siteUrl}
          reason="You get this every Monday because weekly summaries are on."
          unsubscribeUrl={p.unsubscribeUrl}
          preferencesUrl={p.preferencesUrl}
        />
      }
    >
      <Small>{p.weekLabel}</Small>
      <H>Your week in steps</H>
      <Stats
        tone={p.isPro ? 'night' : 'mint'}
        items={[
          { label: 'Steps', value: fmt(p.totalSteps) },
          { label: 'Daily avg', value: fmt(p.avgSteps) },
          { label: 'Goal days', value: `${p.goalDays}/7` },
        ]}
      />
      <Body>{change}</Body>
      <Callout tone="leaf" title={`Best day: ${p.bestDayLabel}`}>
        {`${fmt(p.bestDaySteps)} steps. ${p.streakDays > 0 ? `Your streak is ${p.streakDays} days and counting.` : 'Hit your goal today to start a new streak.'}`}
      </Callout>
      {p.friendRank ? (
        <Body>{`You came #${p.friendRank.rank} of ${p.friendRank.of} among your friends.`}</Body>
      ) : null}
      <Button1 href={p.openAppUrl} tone={p.isPro ? 'gold' : 'deep'}>
        {p.isPro ? 'See your Insights' : 'Open StepQ'}
      </Button1>
      <Signoff />
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// Milestone (first 10K day, streak 7/30/100/365, lifetime 1 lakh / 10 lakh steps)
// ---------------------------------------------------------------------------------------------
export type MilestoneKind = 'first10k' | 'streak' | 'lifetime';
export type MilestoneProps = {
  firstName: string;
  kind: MilestoneKind;
  /** Streak days or lifetime steps; ignored for first10k. */
  value: number;
  shareUrl: string;
} & OptOut;
const milestoneTitle = (p: MilestoneProps) =>
  p.kind === 'first10k'
    ? 'Your first 10K day!'
    : p.kind === 'streak'
      ? `${fmt(p.value)}-day streak!`
      : `${fmt(p.value)} steps with StepQ!`;
export const milestoneSubject = (p: MilestoneProps) => `${milestoneTitle(p)} 🎉`;
export function Milestone(p: MilestoneProps & Base) {
  const line =
    p.kind === 'first10k'
      ? `You walked 10,000 steps in a single day, ${p.firstName}. That's about 7 km. Piko is doing a happy dance.`
      : p.kind === 'streak'
        ? `${fmt(p.value)} days in a row of hitting your goal, ${p.firstName}. That's a habit now.`
        : `Since you joined, you have walked ${fmt(p.value)} steps, ${p.firstName}. That's roughly ${fmt(p.value * 0.00075)} km.`;
  return (
    <Layout
      siteUrl={p.siteUrl}
      mood="cheer"
      preview={line}
      footer={
        <MemberFooter
          kind="lifecycle"
          siteUrl={p.siteUrl}
          reason="You get this when you reach a big milestone."
          unsubscribeUrl={p.unsubscribeUrl}
          preferencesUrl={p.preferencesUrl}
        />
      }
    >
      <H>{milestoneTitle(p)}</H>
      <Body>{line}</Body>
      <Button1 href={p.shareUrl}>Share it with friends</Button1>
      <Signoff />
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// Friend request (only if it is still pending after 24 h and they haven't opened the app)
// ---------------------------------------------------------------------------------------------
export type FriendRequestProps = {
  firstName: string;
  fromName: string;
  fromUsername: string;
  /** How many more requests are waiting, besides this one. */
  othersWaiting: number;
  acceptUrl: string;
} & OptOut;
export const friendRequestSubject = (p: FriendRequestProps) =>
  `${p.fromName} wants to walk with you on StepQ`;
export function FriendRequest(p: FriendRequestProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      preview={`@${p.fromUsername} sent you a friend request.`}
      footer={
        <MemberFooter
          kind="lifecycle"
          siteUrl={p.siteUrl}
          unsubscribeUrl={p.unsubscribeUrl}
          preferencesUrl={p.preferencesUrl}
        />
      }
    >
      <H>You have a friend request</H>
      <Body>{`Hi ${p.firstName}, ${p.fromName} (@${p.fromUsername}) wants to be friends on StepQ. Say yes to see each other's steps and start a friend streak.`}</Body>
      {p.othersWaiting > 0 ? (
        <Body>{`${p.othersWaiting} more ${p.othersWaiting === 1 ? 'request is' : 'requests are'} waiting for you too.`}</Body>
      ) : null}
      <Button1 href={p.acceptUrl}>See request</Button1>
      <Small>Don&apos;t know them? You can ignore or block them from the app.</Small>
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// Challenge result (when a weekly or monthly challenge they joined closes)
// ---------------------------------------------------------------------------------------------
export type ChallengeResultProps = {
  firstName: string;
  challengeName: string;
  rank: number;
  participants: number;
  steps: number;
  /** Set when they won something, e.g. "a ₹500 shopping voucher". */
  reward?: string;
  resultsUrl: string;
  nextChallengeName?: string;
} & OptOut;
export const challengeResultSubject = (p: ChallengeResultProps) =>
  p.reward
    ? `You won in ${p.challengeName}!`
    : `You finished #${fmt(p.rank)} in ${p.challengeName}`;
export function ChallengeResult(p: ChallengeResultProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      mood={p.reward || p.rank <= 10 ? 'cheer' : 'happy'}
      preview={`${fmt(p.steps)} steps, #${fmt(p.rank)} of ${fmt(p.participants)}.`}
      footer={
        <MemberFooter
          kind="lifecycle"
          siteUrl={p.siteUrl}
          unsubscribeUrl={p.unsubscribeUrl}
          preferencesUrl={p.preferencesUrl}
        />
      }
    >
      <H>{p.reward ? `You won, ${p.firstName}!` : `Challenge complete, ${p.firstName}`}</H>
      <Body>{`${p.challengeName} has ended. Here is how you did.`}</Body>
      <Stats
        items={[
          { label: 'Your rank', value: `#${fmt(p.rank)}` },
          { label: 'Walkers', value: fmt(p.participants) },
          { label: 'Your steps', value: fmt(p.steps) },
        ]}
      />
      {p.reward ? (
        <Callout tone="mango" title="Your reward">
          {`You won ${p.reward}. Open the results to claim it.`}
        </Callout>
      ) : null}
      <Button1 href={p.resultsUrl}>{p.reward ? 'Claim my reward' : 'See the full board'}</Button1>
      {p.nextChallengeName ? (
        <>
          <H3>Up next</H3>
          <Body>{`${p.nextChallengeName} starts now. Join from the Challenges tab.`}</Body>
        </>
      ) : null}
      <Signoff />
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// Win-back (no steps synced and no app open for 14 days; a second one at 30 days, then stop)
// ---------------------------------------------------------------------------------------------
export type WinBackProps = {
  firstName: string;
  daysAway: number;
  /** Friends who walked this week, for social proof. */
  friendsWalking: number;
  dailyGoal: number;
  openAppUrl: string;
} & OptOut;
export const winBackSubject = (p: WinBackProps) => `Piko misses you, ${p.firstName}`;
export function WinBack(p: WinBackProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      mood="nudge"
      preview="A short walk today is all it takes to start again."
      footer={
        <MemberFooter
          kind="lifecycle"
          siteUrl={p.siteUrl}
          unsubscribeUrl={p.unsubscribeUrl}
          preferencesUrl={p.preferencesUrl}
        />
      }
    >
      <H>{`It's been ${p.daysAway} days, ${p.firstName}`}</H>
      <Body>
        Life gets busy. That&apos;s fine. A 10 minute walk today is about 1,000 steps, and it&apos;s
        enough to start a new streak.
      </Body>
      {p.friendsWalking > 0 ? (
        <Callout tone="leaf">
          {`${p.friendsWalking} of your friends walked this week. Come and say hi.`}
        </Callout>
      ) : null}
      <Body>{`Too much? Lower your goal from ${fmt(p.dailyGoal)} to something easy in Profile, and build back up.`}</Body>
      <Button1 href={p.openAppUrl}>Walk with Piko today</Button1>
      <Signoff />
    </Layout>
  );
}
