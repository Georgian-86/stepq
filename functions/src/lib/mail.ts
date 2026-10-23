import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { render, type Rendered, type TemplateName } from '@stepq/emails';
import { MAIL_FROM, MAIL_TRANSPORT, RESEND_API_KEY, SITE_URL } from '../config';
import { db } from './admin';

export type { Rendered, TemplateName };
export type MailInput = {
  to: string;
  subject: string;
  template: TemplateName;
  props: object;
  replyTo?: string;
};
export type OutgoingMail = Rendered & { to: string; replyTo?: string };
export type MailTransport = (mail: OutgoingMail) => Promise<void>;

/** Renders a queued mail doc's template; `siteUrl` hosts the Piko PNGs. */
export function renderMail(template: string, props: object): Promise<Rendered> {
  return render(template as TemplateName, props as never, { siteUrl: SITE_URL.value() });
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
