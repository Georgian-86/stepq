import { Cta, Heading, Layout, P } from './Layout';
import { ApplicantDetails, type TeamApplicationAlertProps } from './TeamApplicationAlert';

export type AmbassadorAlertProps = TeamApplicationAlertProps & { approveUrl: string };

export const ambassadorAlertSubject = (p: AmbassadorAlertProps) =>
  `New ambassador application: ${p.name} · ${p.roleLabel}`;

export function AmbassadorAlert(p: AmbassadorAlertProps & { siteUrl: string }) {
  return (
    <Layout siteUrl={p.siteUrl} preview={`${p.name} applied to be an ambassador.`}>
      <Heading>New ambassador application</Heading>
      <P>{`${p.name} applied to be a StepQ ambassador.`}</P>
      <ApplicantDetails {...p} />
      <Cta href={p.resumeUrl}>Open resume</Cta>
      <Cta href={p.approveUrl}>Approve ambassador</Cta>
    </Layout>
  );
}
