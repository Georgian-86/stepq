import { CheckRow, Cta, Heading, Layout, P, Strong } from './Layout';

export type BackingAlertProps = {
  name: string;
  phone: string;
  amount: number;
  reference: string;
  createdAtIst: string;
  showOnWall: boolean;
  verifyUrl: string;
};

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export const backingAlertSubject = (p: BackingAlertProps) =>
  `New backing: ${rupees(p.amount)} from ${p.name}`;

export function BackingAlert(p: BackingAlertProps & { siteUrl: string }) {
  return (
    <Layout siteUrl={p.siteUrl} preview={`${p.name} says they paid ${rupees(p.amount)}.`}>
      <Heading>{`New backing: ${rupees(p.amount)}`}</Heading>
      <P>{`${p.name} says they paid ${rupees(p.amount)}. Check your UPI app, then verify it.`}</P>
      <Strong>Details</Strong>
      <CheckRow>{`Name: ${p.name}`}</CheckRow>
      <CheckRow>{`Phone: ${p.phone}`}</CheckRow>
      <CheckRow>{`Amount: ${rupees(p.amount)}`}</CheckRow>
      <CheckRow>{`UPI reference: ${p.reference}`}</CheckRow>
      <CheckRow>{`Submitted: ${p.createdAtIst}`}</CheckRow>
      <CheckRow>{`Show on wall: ${p.showOnWall ? 'Yes' : 'No'}`}</CheckRow>
      <Cta href={p.verifyUrl}>Verify this payment</Cta>
    </Layout>
  );
}
