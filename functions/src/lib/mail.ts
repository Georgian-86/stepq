import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { MAIL_FROM, MAIL_TRANSPORT, RESEND_API_KEY } from '../config';
import { db } from './admin';

export type TemplateName = string;
export type MailInput = {
  to: string;
  subject: string;
  template: TemplateName;
  props: object;
  replyTo?: string;
};
export type Rendered = { subject: string; html: string; text: string };
export type OutgoingMail = Rendered & { to: string; replyTo?: string };
export type MailTransport = (mail: OutgoingMail) => Promise<void>;

// Stub until Task 7 swaps this single import for `@stepq/emails`.
export function render(template: TemplateName, props: Record<string, unknown>): Rendered {
  const json = JSON.stringify(props, null, 2);
  const escaped = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return {
    subject: typeof props.subject === 'string' ? props.subject : template,
    html: `<pre>${escaped}</pre>`,
    text: json,
  };
}

let transport: MailTransport | undefined;
export function setMailTransport(t: MailTransport | undefined): void {
  transport = t;
}

export function getMailTransport(): MailTransport | null {
  if (transport) return transport;
  if (MAIL_TRANSPORT.value() === 'outbox') return null;
  return async (mail) => {
    const { error } = await new Resend(RESEND_API_KEY.value()).emails.send({
      from: MAIL_FROM.value(),
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
    });
    if (error) throw new Error(`Resend: ${error.message}`);
  };
}

export function queueMail(tx: Transaction, mail: MailInput): void;
export function queueMail(tx: null, mail: MailInput): Promise<void>;
export function queueMail(tx: Transaction | null, mail: MailInput): void | Promise<void> {
  const ref = db().collection('mail').doc();
  const doc = { ...mail, status: 'queued', attempts: 0, createdAt: FieldValue.serverTimestamp() };
  if (tx) {
    tx.set(ref, doc);
    return;
  }
  return ref.set(doc).then(() => undefined);
}
