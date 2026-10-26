import { render, type Rendered, type TemplateName } from '@stepq/emails';
import { query, type Client } from './db';
import { env } from './env';

export type MailInput = {
  to: string;
  subject: string;
  template: TemplateName;
  props: object;
  replyTo?: string;
};
export type OutgoingMail = Rendered & { to: string; replyTo?: string };
export type MailTransport = (mail: OutgoingMail) => Promise<void>;

export const MAX_ATTEMPTS = 6;
const MAX_AGE = '24 hours';
/** A failed send waits this long before the next try. */
const RETRY_AFTER = '1 minute';
/** A send that has not finished in this long is assumed lost and tried again. */
const STALE_SENDING = '5 minutes';

/** Queues a mail in the caller's transaction, so it exists only if the request's writes commit. */
export async function queueMail(c: Client, mail: MailInput): Promise<void> {
  await c.query(
    `insert into stepq.mail (to_addr, subject, template, props, reply_to)
     values ($1, $2, $3, $4, $5)`,
    [mail.to, mail.subject, mail.template, JSON.stringify(mail.props), mail.replyTo ?? null],
  );
}

let override: MailTransport | null | undefined;
/** Tests only. */
export function setMailTransport(t: MailTransport | null | undefined): void {
  override = t;
}

/** Resend if RESEND_API_KEY is set, else SMTP if SMTP_HOST is set; null = keep mail queued. */
export function getMailTransport(): MailTransport | null {
  if (override !== undefined) return override;
  if (env.mailTransport() === 'outbox') return null;
  // e2e: render and mark sent, without sending anything.
  if (env.mailTransport() === 'log') return async () => {};
  const from = env.mailFrom();
  const key = env.resendApiKey();
  if (key) {
    return async (mail) => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to: mail.to,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
        }),
      });
      if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    };
  }
  const smtp = env.smtp();
  if (smtp.host) {
    return async (mail) => {
      const { createTransport } = await import('nodemailer');
      await createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
      }).sendMail({
        from,
        to: mail.to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        ...(mail.replyTo ? { replyTo: mail.replyTo } : {}),
      });
    };
  }
  return null;
}

type MailRow = {
  id: string;
  to_addr: string;
  subject: string;
  template: TemplateName;
  props: object;
  reply_to: string | null;
  attempts: number;
};

/**
 * Sends queued mail, one row at a time (claimed with SKIP LOCKED so concurrent runs never send
 * twice). Runs after each request's response, so a failed send is retried by the next request,
 * up to MAX_ATTEMPTS within 24 h, then marked failed. With no transport configured, mail stays
 * queued and goes out once one is.
 */
export async function deliverPendingMail(limit = 10): Promise<number> {
  const transport = getMailTransport();
  if (!transport) return 0;
  let sent = 0;
  for (let i = 0; i < limit; i++) {
    const { rows } = await query<MailRow>(
      `update stepq.mail set status = 'sending', attempts = attempts + 1, updated_at = now()
       where id = (
         select id from stepq.mail
         where ((status = 'queued' and (attempts = 0 or updated_at < now() - interval '${RETRY_AFTER}'))
             or (status = 'sending' and updated_at < now() - interval '${STALE_SENDING}'))
           and created_at > now() - interval '${MAX_AGE}'
         order by id limit 1 for update skip locked)
       returning id, to_addr, subject, template, props, reply_to, attempts`,
    );
    const mail = rows[0];
    if (!mail) break;
    try {
      const rendered = await render(mail.template, mail.props as never, { siteUrl: env.siteUrl() });
      await transport({
        ...rendered,
        subject: mail.subject || rendered.subject,
        to: mail.to_addr,
        ...(mail.reply_to ? { replyTo: mail.reply_to } : {}),
      });
      await query(
        `update stepq.mail set status = 'sent', sent_at = now(), updated_at = now() where id = $1`,
        [mail.id],
      );
      sent++;
    } catch (err) {
      const lastError = (err instanceof Error ? err.message : String(err)).slice(0, 1000);
      const status = mail.attempts >= MAX_ATTEMPTS ? 'failed' : 'queued';
      console.error('mail delivery failed', {
        mailId: mail.id,
        attempts: mail.attempts,
        lastError,
      });
      await query(
        `update stepq.mail set status = $2, last_error = $3, updated_at = now() where id = $1`,
        [mail.id, status, lastError],
      );
    }
  }
  return sent;
}
