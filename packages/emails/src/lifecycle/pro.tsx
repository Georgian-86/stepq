import { Layout, proColors } from '../Layout';
import { Body, Button1, Callout, H, H3, MemberFooter, Signoff, Small, Steps } from './ui';

/**
 * StepQ Pro emails, in the "Kadam Gold" look (night-green header, gold accents). All of them are
 * transactional: they are about the member's own plan. The App Store sends Apple's receipts and
 * renewal notices itself, so these never show prices Apple already shows, and point to Apple for
 * billing changes.
 */

type Base = { siteUrl: string };
export type ProSource = 'app_store' | 'admin';

/** The Pro features, in the order the app's Free vs Pro page lists them. */
export const PRO_PERKS = [
  'Unlimited Insights: your full step history, not just 7 days',
  '8 streak restores a month instead of 2',
  'Monthly and Pro-only challenges, with bigger rewards',
  'Unlimited community posts and water reminders',
  'Pin your BFF and keep a friend streak front and centre',
  'Your own photo, five app themes and the gold PRO badge',
];

// ---------------------------------------------------------------------------------------------
// Welcome to Pro
// ---------------------------------------------------------------------------------------------
export type WelcomeProProps = {
  firstName: string;
  source: ProSource;
  /** e.g. "28 Dec 2026", for App Store subscriptions. */
  renewsOn?: string;
  openAppUrl: string;
};
export const welcomeProSubject = (p: WelcomeProProps) => `Welcome to StepQ Pro, ${p.firstName} 👑`;
export function WelcomePro(p: WelcomeProProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      variant="pro"
      mood="cheer"
      preview="Your Pro perks are on. Here is what's new."
      footer={
        <MemberFooter
          kind="transactional"
          siteUrl={p.siteUrl}
          reason="You are getting this because your StepQ account is now Pro."
        />
      }
    >
      <H>{`You're Pro now, ${p.firstName}!`}</H>
      <Body>
        Thank you for backing StepQ. Every Pro member helps us keep the app free for walkers across
        India. Everything below is already switched on.
      </Body>
      <Steps tone="gold" items={PRO_PERKS} />
      <Button1 href={p.openAppUrl} tone="gold">
        Explore Pro
      </Button1>
      <H3>Try these first</H3>
      <Steps
        numbered
        tone="gold"
        items={[
          'Pick a theme in Profile → Make it yours. Gold is our favourite.',
          'Open Insights to see every step since you joined.',
          'Ask to host a QRun. Pro members can plan walks once we approve them.',
        ]}
      />
      {p.source === 'app_store' ? (
        <Callout tone="champagne" title="About your subscription">
          {`Billing is handled by the App Store${p.renewsOn ? `, and your plan renews on ${p.renewsOn}` : ''}. Manage or cancel any time in Settings → Apple ID → Subscriptions.`}
        </Callout>
      ) : (
        <Callout tone="champagne" title="A gift from the StepQ team">
          Your Pro membership was added by the StepQ team, so there is nothing to pay.
        </Callout>
      )}
      <Signoff />
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// Renewal reminder (yearly plans only, 7 days before)
// ---------------------------------------------------------------------------------------------
export type ProRenewalReminderProps = {
  firstName: string;
  renewsOn: string;
  planLabel: string;
  manageUrl: string;
};
export const proRenewalReminderSubject = (p: ProRenewalReminderProps) =>
  `Your StepQ Pro renews on ${p.renewsOn}`;
export function ProRenewalReminder(p: ProRenewalReminderProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      variant="pro"
      preview="Nothing to do if you'd like to stay Pro."
      footer={<MemberFooter kind="transactional" siteUrl={p.siteUrl} />}
    >
      <H>A heads-up about your Pro plan</H>
      <Body>{`Hi ${p.firstName}, your ${p.planLabel} renews on ${p.renewsOn} through the App Store. If you'd like to stay Pro, there is nothing to do.`}</Body>
      <Body>To change or cancel, manage your subscription in the App Store before that date.</Body>
      <Button1 href={p.manageUrl} tone="gold">
        Manage subscription
      </Button1>
      <Small>Apple sends the receipt and charges the card on your Apple ID.</Small>
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// Billing issue (App Store DID_FAIL_TO_RENEW; Pro stays on during Apple's grace period)
// ---------------------------------------------------------------------------------------------
export type ProBillingIssueProps = { firstName: string; graceEndsOn?: string; manageUrl: string };
export const proBillingIssueSubject = () => 'Action needed: we couldn’t renew your StepQ Pro';
export function ProBillingIssue(p: ProBillingIssueProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      variant="pro"
      mood="nudge"
      preview="Update your payment method to keep your Pro perks."
      footer={<MemberFooter kind="transactional" siteUrl={p.siteUrl} />}
    >
      <H>Your Pro payment didn&apos;t go through</H>
      <Body>{`Hi ${p.firstName}, the App Store couldn't renew your StepQ Pro. This usually means a card has expired or needs approving.`}</Body>
      <Callout tone="tomato" title="Keep your perks">
        {p.graceEndsOn
          ? `Pro stays on until ${p.graceEndsOn}. Update your payment method before then and nothing changes.`
          : 'Update your payment method to switch Pro back on. Your streaks and history are safe.'}
      </Callout>
      <Button1 href={p.manageUrl} tone="gold">
        Update payment method
      </Button1>
      <Small>StepQ never sees your card details. Apple handles all payments.</Small>
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// Pro ended (expired, cancelled, refunded or removed by an admin)
// ---------------------------------------------------------------------------------------------
export type ProEndedProps = { firstName: string; endedOn: string; comeBackUrl: string };
export const proEndedSubject = () => 'Your StepQ Pro has ended';
export function ProEnded(p: ProEndedProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      preview="Your steps, streaks and friends are all still here."
      footer={<MemberFooter kind="transactional" siteUrl={p.siteUrl} />}
    >
      <H>{`Your Pro plan ended on ${p.endedOn}`}</H>
      <Body>{`Thank you for being Pro, ${p.firstName}. You're back on StepQ Free, and nothing you made is lost.`}</Body>
      <Callout tone="mint" title="What stays">
        Your steps, streaks, friends, groups and posts. Your full history is kept, so Insights opens
        right back up if you return.
      </Callout>
      <Callout tone="mango" title="What changes">
        Insights shows the last 7 days, you get 2 streak restores a month, and your theme goes back
        to Leaf.
      </Callout>
      <Button1 href={p.comeBackUrl} tone="gold">
        Come back to Pro
      </Button1>
      <Small>
        Was this a mistake? If your card failed, update it in the App Store and Pro switches back
        on.
      </Small>
      <Signoff />
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// QRun host approved (admin sets profiles.qrun_host for a Pro member)
// ---------------------------------------------------------------------------------------------
export type QrunHostApprovedProps = { firstName: string; postQrunUrl: string };
export const qrunHostApprovedSubject = () => 'You can now host QRuns on StepQ';
export function QrunHostApproved(p: QrunHostApprovedProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      variant="pro"
      mood="cheer"
      preview="Plan your first group walk."
      footer={<MemberFooter kind="transactional" siteUrl={p.siteUrl} />}
    >
      <H>{`You're a QRun host, ${p.firstName}!`}</H>
      <Body>
        The StepQ team approved your request. You can now post QRuns, group walks anyone nearby can
        join.
      </Body>
      <Steps
        tone="gold"
        items={[
          'Pick a public, well-lit place and a time.',
          'Add a pace note so everyone knows what to expect.',
          'Be there 10 minutes early to welcome people.',
        ]}
      />
      <Button1 href={p.postQrunUrl} tone="gold">
        Post my first QRun
      </Button1>
      <Small>
        <span style={{ color: proColors.goldText }}>Hosts keep QRuns safe and friendly.</span> Posts
        that break the community rules can be removed.
      </Small>
      <Signoff />
    </Layout>
  );
}
