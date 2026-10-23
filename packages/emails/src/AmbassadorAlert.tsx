import { Link, Text } from '@react-email/components';
import { Cta, Heading, Layout, layoutStyles, P, safeHref, Strong } from './Layout';

export type AmbassadorAlertProps = {
  name: string;
  email: string;
  phone: string;
  city: string;
  /** Handle without the leading @. */
  instagram: string;
  instagramUrl: string;
  followersLabel: string;
  collegeOrCompany: string;
  plan: string;
  approveUrl: string;
};

const firstWord = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export const ambassadorAlertSubject = (p: AmbassadorAlertProps) =>
  `New ambassador application: ${p.name} · ${p.city}`;

function Row(p: { label: string; children: React.ReactNode }) {
  return (
    <Text style={{ ...layoutStyles.p, marginBottom: 8 }}>
      <strong>{p.label}:</strong> {p.children}
    </Text>
  );
}

export function AmbassadorAlert(p: AmbassadorAlertProps & { siteUrl: string }) {
  const href = safeHref(p.instagramUrl);
  return (
    <Layout siteUrl={p.siteUrl} preview={`${p.name} applied to be an ambassador.`}>
      <Heading>New ambassador application</Heading>
      <P>{`${p.name} applied to be a StepQ ambassador.`}</P>
      <Strong>Details</Strong>
      <Row label="Name">{p.name}</Row>
      <Row label="Email">{p.email}</Row>
      <Row label="Phone">{p.phone}</Row>
      <Row label="City">{p.city}</Row>
      <Row label="Instagram">
        {href ? (
          <Link href={href} style={layoutStyles.link}>{`@${p.instagram}`}</Link>
        ) : (
          `@${p.instagram}`
        )}
      </Row>
      <Row label="Followers">{p.followersLabel}</Row>
      <Row label="College or company">{p.collegeOrCompany}</Row>
      <Strong>Their plan</Strong>
      <P>{p.plan}</P>
      <Cta href={p.approveUrl}>{`Approve ${firstWord(p.name)}`}</Cta>
    </Layout>
  );
}
