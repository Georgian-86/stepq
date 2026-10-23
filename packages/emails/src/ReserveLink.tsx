import { Cta, Heading, Layout, Muted, P } from './Layout';

export type ReserveLinkProps = { firstName: string; position: number; reserveUrl: string };

export const reserveLinkSubject = (p: ReserveLinkProps) =>
  `${p.firstName}, reserve your StepQ username`;

export function ReserveLink(p: ReserveLinkProps & { siteUrl: string }) {
  return (
    <Layout siteUrl={p.siteUrl} preview="Your spot is saved. Reserve your username.">
      <Heading>{`You are in, ${p.firstName}!`}</Heading>
      <P>{`You are number ${p.position} on the StepQ waitlist. Reserve your username before it is taken.`}</P>
      <Cta href={p.reserveUrl}>Reserve your username</Cta>
      <Muted>Chalo, chalte hain.</Muted>
    </Layout>
  );
}
