import { Layout } from '../Layout';
import { Body, Button1, Callout, H, MemberFooter, Signoff, Small } from './ui';

/**
 * Account and security emails. All transactional: they go to everyone, including members under
 * 18, and carry no unsubscribe link (they are about the member's own account).
 */

type Base = { siteUrl: string };

// ---------------------------------------------------------------------------------------------
// Password changed (security notice)
// ---------------------------------------------------------------------------------------------
export type PasswordChangedProps = { firstName: string; changedAtIst: string; resetUrl: string };
export const passwordChangedSubject = () => 'Your StepQ password was changed';
export function PasswordChanged(p: PasswordChangedProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      preview="If this was you, there is nothing to do."
      footer={<MemberFooter kind="transactional" siteUrl={p.siteUrl} />}
    >
      <H>Your password was changed</H>
      <Body>{`Hi ${p.firstName}, the password for your StepQ account was changed on ${p.changedAtIst}.`}</Body>
      <Callout tone="mint" title="Was this you?">
        Then you are all set. There is nothing else to do.
      </Callout>
      <Body>
        If you did not change it, reset your password now. This signs you out everywhere else.
      </Body>
      <Button1 href={p.resetUrl}>Reset my password</Button1>
      <Small>StepQ will never ask for your password by email, call or message.</Small>
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// Account deleted
// ---------------------------------------------------------------------------------------------
export type AccountDeletedProps = { firstName: string; deletedAtIst: string };
export const accountDeletedSubject = () => 'Your StepQ account has been deleted';
export function AccountDeleted(p: AccountDeletedProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      preview="Your steps, friends and posts are gone. Sorry to see you go."
      footer={
        <MemberFooter
          kind="transactional"
          siteUrl={p.siteUrl}
          reason="This is the last email StepQ will send you about this account."
        />
      }
    >
      <H>{`Goodbye for now, ${p.firstName}`}</H>
      <Body>{`Your StepQ account was deleted on ${p.deletedAtIst}. Your steps, streaks, friends, groups and posts are gone, and nobody can see your profile any more.`}</Body>
      <Callout tone="mint" title="What StepQ keeps">
        Indian law (IT Rules 2021) asks us to keep your name, username and email for 180 days after
        you leave. After that they are deleted too. Nothing else is kept.
      </Callout>
      <Body>
        If you paid for Pro through the App Store, cancel the subscription in your Apple ID settings
        so you are not charged again. Deleting your account does not cancel it for you.
      </Body>
      <Body>Did not ask for this? Write to connect@stepq.in straight away and we will help.</Body>
      <Signoff />
    </Layout>
  );
}

// ---------------------------------------------------------------------------------------------
// Parent consent: reminder (day 4 of 7) and confirmation of the parent's choice
// ---------------------------------------------------------------------------------------------
export type ParentConsentReminderProps = {
  parentName: string;
  childName: string;
  consentUrl: string;
  daysLeft: number;
};
export const parentConsentReminderSubject = (p: ParentConsentReminderProps) =>
  `Reminder: ${p.childName} is waiting for your answer`;
export function ParentConsentReminder(p: ParentConsentReminderProps & Base) {
  const days = p.daysLeft === 1 ? '1 day' : `${p.daysLeft} days`;
  return (
    <Layout
      siteUrl={p.siteUrl}
      mood="nudge"
      preview={`${days} left to say yes or no.`}
      footer={
        <MemberFooter
          kind="transactional"
          siteUrl={p.siteUrl}
          reason="You are getting this because your email was given as a parent or guardian. This is the only reminder."
        />
      }
    >
      <H>{`Hi ${p.parentName},`}</H>
      <Body>{`${p.childName} asked for your consent to use StepQ, a walking app. You have ${days} left to answer. If we don't hear from you, their account is deleted.`}</Body>
      <Button1 href={p.consentUrl}>Review and decide</Button1>
      <Small>
        If you don&apos;t know who this is, ignore this email: nothing happens without you.
      </Small>
    </Layout>
  );
}

export type ParentConsentGrantedProps = { parentName: string; childName: string };
export const parentConsentGrantedSubject = (p: ParentConsentGrantedProps) =>
  `Thank you. ${p.childName} can now use StepQ`;
export function ParentConsentGranted(p: ParentConsentGrantedProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      mood="cheer"
      preview="A copy of your consent, and how to withdraw it."
      footer={
        <MemberFooter
          kind="transactional"
          siteUrl={p.siteUrl}
          reason="Keep this email as a record of your consent."
        />
      }
    >
      <H>Thank you for saying yes</H>
      <Body>{`Hi ${p.parentName}, ${p.childName} can now count steps, join friends and take part in challenges on StepQ.`}</Body>
      <Callout tone="leaf" title="How StepQ looks after under-18s">
        No ads, no tracking for advertising, and no marketing emails. We only email {p.childName}{' '}
        about their own account.
      </Callout>
      <Body>
        You can withdraw your consent at any time by writing to connect@stepq.in. We then delete{' '}
        {p.childName}&apos;s account and data.
      </Body>
      <Signoff />
    </Layout>
  );
}
