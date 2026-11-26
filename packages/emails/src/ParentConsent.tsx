import { Cta, Heading, Layout, Muted, P } from './Layout';

export type ParentConsentProps = { parentName: string; childName: string; consentUrl: string };

export const parentConsentSubject = (p: ParentConsentProps) =>
  `${p.childName} wants to use StepQ: your consent is needed`;

/** To a parent: a teen (13 to 17) signed up and needs their consent (DPDP Act s.9). */
export function ParentConsent(p: ParentConsentProps & { siteUrl: string }) {
  return (
    <Layout siteUrl={p.siteUrl} preview={`${p.childName} asked for your consent to use StepQ.`}>
      <Heading>{`Hi ${p.parentName},`}</Heading>
      <P>{`${p.childName} signed up for StepQ, a walking app, and gave your email as their parent or guardian. Because they are under 18, Indian law needs your consent before StepQ can keep their steps and profile.`}</P>
      <P>
        The link shows what StepQ collects and why. You can say yes or no, and withdraw later by
        emailing us. If you don&apos;t answer within 7 days, their account is deleted.
      </P>
      <Cta href={p.consentUrl}>Review and decide</Cta>
      <Muted>
        If you don&apos;t know who this is, ignore this email: nothing happens without you.
      </Muted>
    </Layout>
  );
}
