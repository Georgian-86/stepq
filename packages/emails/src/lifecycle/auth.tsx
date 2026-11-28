import { Layout } from '../Layout';
import { Body, Button1, Callout, H, MemberFooter, Small } from './ui';

/**
 * Supabase Auth emails. Supabase sends these itself (sign-up, reset, email change), so they are
 * exported as HTML with Supabase's Go template variables by `pnpm export:supabase` and pasted
 * into Supabase → Authentication → Email Templates. Point Supabase's custom SMTP at Resend
 * (smtp.resend.com) so they come from the same domain as everything else.
 *
 * The props default to the Supabase variables, so `render()` with sample URLs is only for
 * previews and tests.
 */

type Base = { siteUrl: string };
export const SUPABASE = {
  confirmationUrl: '{{ .ConfirmationURL }}',
  newEmail: '{{ .NewEmail }}',
  email: '{{ .Email }}',
} as const;

export type AuthConfirmSignupProps = { confirmUrl?: string };
export const authConfirmSignupSubject = () => 'Confirm your email for StepQ';
export function AuthConfirmSignup(p: AuthConfirmSignupProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      preview="One tap and you are in."
      footer={
        <MemberFooter
          kind="transactional"
          siteUrl={p.siteUrl}
          reason="You are getting this because this email was used to sign up for StepQ."
        />
      }
    >
      <H>Confirm your email</H>
      <Body>
        Welcome to StepQ! Tap the button to confirm this is your email and finish signing up.
      </Body>
      <Button1 href={p.confirmUrl ?? SUPABASE.confirmationUrl}>Confirm my email</Button1>
      <Small>The link works once and expires soon, so use it now.</Small>
      <Small>Didn&apos;t sign up? Ignore this email and no account will be created.</Small>
    </Layout>
  );
}

export type AuthResetPasswordProps = { resetUrl?: string };
export const authResetPasswordSubject = () => 'Reset your StepQ password';
export function AuthResetPassword(p: AuthResetPasswordProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      mood="nudge"
      preview="Pick a new password in a minute."
      footer={<MemberFooter kind="transactional" siteUrl={p.siteUrl} />}
    >
      <H>Reset your password</H>
      <Body>Someone (hopefully you) asked to reset the password for your StepQ account.</Body>
      <Button1 href={p.resetUrl ?? SUPABASE.confirmationUrl}>Choose a new password</Button1>
      <Small>The link works once and expires soon, so use it now.</Small>
      <Small>Didn&apos;t ask for this? Ignore this email. Your password stays the same.</Small>
    </Layout>
  );
}

export type AuthEmailChangeProps = { confirmUrl?: string; newEmail?: string };
export const authEmailChangeSubject = () => 'Confirm your new email for StepQ';
export function AuthEmailChange(p: AuthEmailChangeProps & Base) {
  return (
    <Layout
      siteUrl={p.siteUrl}
      preview="Confirm the change to your StepQ email."
      footer={<MemberFooter kind="transactional" siteUrl={p.siteUrl} />}
    >
      <H>Confirm your new email</H>
      <Body>{`You asked to change the email on your StepQ account to ${p.newEmail ?? SUPABASE.newEmail}.`}</Body>
      <Button1 href={p.confirmUrl ?? SUPABASE.confirmationUrl}>Confirm new email</Button1>
      <Callout tone="tomato" title="Didn't ask for this?">
        Don&apos;t tap the button. Reset your password from the app and write to connect@stepq.in.
      </Callout>
    </Layout>
  );
}
