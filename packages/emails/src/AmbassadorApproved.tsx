import { CheckRow, Cta, Heading, Layout, Muted, P, Strong } from './Layout';

export type AmbassadorApprovedProps = { firstName: string; city: string; kitUrl?: string };

export const ambassadorApprovedSubject = (p: AmbassadorApprovedProps) =>
  `Congratulations, ${p.firstName}! You are a StepQ ambassador`;

export function AmbassadorApproved(p: AmbassadorApprovedProps & { siteUrl: string }) {
  return (
    <Layout siteUrl={p.siteUrl} mood="cheer" preview="You are now a StepQ ambassador.">
      <Heading>{`Congratulations, ${p.firstName}!`}</Heading>
      <P>{`You are now a StepQ ambassador. Thank you for wanting to get more people walking in ${p.city}.`}</P>
      <Strong>What happens next</Strong>
      <CheckRow>StepQ will add you to the ambassador group.</CheckRow>
      <CheckRow>You will get your ambassador kit and referral link.</CheckRow>
      <CheckRow>Start your first walking group or QRun.</CheckRow>
      {p.kitUrl ? <Cta href={p.kitUrl}>Open your ambassador kit</Cta> : null}
      <Muted>Chalo, chalte hain.</Muted>
      <Muted>Bhakti, StepQ</Muted>
    </Layout>
  );
}
