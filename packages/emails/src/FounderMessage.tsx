import { Text } from '@react-email/components';
import { CheckRow, Cta, Heading, Layout, P, Strong, layoutStyles } from './Layout';

export type FounderMessageProps = {
  name: string;
  email: string;
  phone?: string;
  topicLabel: string;
  message: string;
};

export const founderMessageSubject = (p: FounderMessageProps) =>
  `New message from ${p.name} · ${p.topicLabel}`;

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name;

export function FounderMessage(p: FounderMessageProps & { siteUrl: string }) {
  return (
    <Layout siteUrl={p.siteUrl} preview={`${p.name} wrote to you from the StepQ website.`}>
      <Heading>New message for the founder</Heading>
      <P>{`${p.name} wrote to you from the StepQ website.`}</P>
      <Strong>Their details</Strong>
      <CheckRow>{`Email: ${p.email}`}</CheckRow>
      {p.phone ? <CheckRow>{`Phone: ${p.phone}`}</CheckRow> : null}
      <CheckRow>{`Topic: ${p.topicLabel}`}</CheckRow>
      <Cta href={`mailto:${p.email}`}>{`Reply to ${firstName(p.name)}`}</Cta>
      <Text style={{ ...layoutStyles.muted, whiteSpace: 'pre-wrap' }}>{`“${p.message}”`}</Text>
    </Layout>
  );
}
