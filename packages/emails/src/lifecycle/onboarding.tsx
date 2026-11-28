import { Layout } from '../Layout';
import {
  A,
  Body,
  Button1,
  Callout,
  fmt,
  H,
  H3,
  MemberFooter,
  Signoff,
  Small,
  Steps,
  type OptOut,
} from './ui';

/**
 * Onboarding (day 0 to day 3). Welcome is transactional (it confirms the account); the two
 * nudges are lifecycle mail and are skipped as soon as the member has done the thing.
 */

type Base = { siteUrl: string };

// ---------------------------------------------------------------------------------------------
// Welcome (day 0)
// ---------------------------------------------------------------------------------------------
export type WelcomeProps = { firstName: string; dailyGoal: number; openAppUrl: string };
export const welcomeSubject = (p: WelcomeProps) => `Welcome to StepQ, ${p.firstName}!`;
export function Welcome(p: WelcomeProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      mood="cheer"
      preview={`Your goal is ${fmt(p.dailyGoal)} steps a day. Here is how to get there.`}
      footer={
        <MemberFooter
          kind="transactional"
          siteUrl={p.siteUrl}
          reason="You are getting this because you just made a StepQ account."
        />
      }
    >
      <H>{`Welcome to StepQ, ${p.firstName}!`}</H>
      <Body>{`Piko is ready to walk with you. Your daily goal is ${fmt(p.dailyGoal)} steps, and every step counts toward your streak and your StepQ score.`}</Body>
      <H3>Three things for your first day</H3>
      <Steps
        numbered
        items={[
          <>
            <b>Let Piko count your steps.</b> Connect Health Connect or Apple Health so your walks
            show up on their own.
          </>,
          <>
            <b>Add a friend.</b> Walking is easier together, and you can nudge each other to drink
            water.
          </>,
          <>
            <b>Join this week&apos;s challenge.</b> Climb the board and win rewards.
          </>,
        ]}
      />
      <Button1 href={p.openAppUrl}>Open StepQ</Button1>
      <Callout tone="mango" title="Tip from Piko">
        Hit your goal today and tomorrow to start a streak. Miss a day? You can restore it.
      </Callout>
      <Signoff />
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// Connect steps (day 1, only if no steps have synced)
// ---------------------------------------------------------------------------------------------
export type ConnectStepsProps = {
  firstName: string;
  connectUrl: string;
  platform: 'android' | 'ios';
} & OptOut;
export const connectStepsSubject = () => 'Piko can’t see your steps yet';
export function ConnectSteps(p: ConnectStepsProps & Base) {
  const source = p.platform === 'ios' ? 'Apple Health' : 'Health Connect';
  return (
    <Layout
      siteUrl={p.siteUrl}
      mood="nudge"
      preview={`Connect ${source} in 30 seconds and every walk counts.`}
      footer={
        <MemberFooter
          kind="lifecycle"
          siteUrl={p.siteUrl}
          unsubscribeUrl={p.unsubscribeUrl}
          preferencesUrl={p.preferencesUrl}
        />
      }
    >
      <H>{`Your steps aren't counting yet, ${p.firstName}`}</H>
      <Body>{`StepQ reads your steps from ${source}, so you never have to start or stop anything. It isn't connected yet, so your walks don't count toward your streak.`}</Body>
      <Steps
        numbered
        items={[
          'Open StepQ and tap Connect steps.',
          `Allow ${source} to share steps and distance.`,
          'That’s it. Piko updates your ring on its own.',
        ]}
      />
      <Button1 href={p.connectUrl}>Connect my steps</Button1>
      <Small>
        StepQ only reads steps, distance and active minutes. It never sells or shares your health
        data.
      </Small>
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// Find friends (day 3, only if they have no friends yet)
// ---------------------------------------------------------------------------------------------
export type FindFriendsProps = {
  firstName: string;
  inviteUrl: string;
  username: string;
} & OptOut;
export const findFriendsSubject = () => 'Walking is better with friends';
export function FindFriends(p: FindFriendsProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      preview="Invite a friend and see who walks more this week."
      footer={
        <MemberFooter
          kind="lifecycle"
          siteUrl={p.siteUrl}
          unsubscribeUrl={p.unsubscribeUrl}
          preferencesUrl={p.preferencesUrl}
        />
      }
    >
      <H>Bring a friend along</H>
      <Body>{`People who walk with a friend keep their streaks going longer. Invite someone and you can see each other's steps, start a friend streak and send water reminders.`}</Body>
      <Callout tone="mint" title="Your username">
        {`Friends can find you as @${p.username}.`}
      </Callout>
      <Button1 href={p.inviteUrl}>Invite a friend</Button1>
      <Body>
        Already know people on StepQ? Open <b>Friends</b> in the app and search by name or username.
      </Body>
      <Signoff />
      <Small>
        Want walking groups near you? <A href={`${p.siteUrl}/ambassadors`}>Meet our ambassadors</A>.
      </Small>
    </Layout>
  );
}
