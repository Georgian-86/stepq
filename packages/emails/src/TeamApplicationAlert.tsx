import { CheckRow, Heading, Layout, MaybeLink, P, Strong, Cta } from './Layout';

export type TeamApplicationAlertProps = {
  name: string;
  email: string;
  phone: string;
  roleLabel: string;
  link?: string;
  why: string;
  resumeUrl: string;
};

export const teamApplicationAlertSubject = (p: TeamApplicationAlertProps) =>
  `New team application: ${p.name} · ${p.roleLabel}`;

export function ApplicantDetails(p: TeamApplicationAlertProps) {
  return (
    <>
      <Strong>Details</Strong>
      <CheckRow>{`Name: ${p.name}`}</CheckRow>
      <CheckRow>{`Email: ${p.email}`}</CheckRow>
      <CheckRow>{`Phone: ${p.phone}`}</CheckRow>
      <CheckRow>{`Role: ${p.roleLabel}`}</CheckRow>
      {p.link ? (
        <CheckRow>
          Link: <MaybeLink url={p.link} />
        </CheckRow>
      ) : null}
      <Strong>Why they want to join</Strong>
      <P>{p.why}</P>
    </>
  );
}

export function TeamApplicationAlert(p: TeamApplicationAlertProps & { siteUrl: string }) {
  return (
    <Layout siteUrl={p.siteUrl} preview={`${p.name} applied for ${p.roleLabel}.`}>
      <Heading>New team application</Heading>
      <P>{`${p.name} applied for ${p.roleLabel}.`}</P>
      <ApplicantDetails {...p} />
      <Cta href={p.resumeUrl}>Open resume</Cta>
    </Layout>
  );
}
