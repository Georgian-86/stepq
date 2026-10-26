import { createHash } from 'node:crypto';

/** Server configuration, read from the environment (Vercel → Settings → Environment Variables). */
function read(name: string, fallback = ''): string {
  return process.env[name]?.trim() || fallback;
}

export const env = {
  /** Supabase Postgres: the Transaction pooler string (port 6543) on Vercel. */
  databaseUrl: () => read('DATABASE_URL'),
  /** HMAC key for the emailed Approve / Verify / reserve / résumé links. */
  // Falls back to a key derived from DATABASE_URL (server-only too), so a deploy needs one
  // secret; set ACTION_SIGNING_SECRET to decouple it (changing either voids open links).
  signingSecret: () => {
    const s = read('ACTION_SIGNING_SECRET');
    if (s) return s;
    const db = read('DATABASE_URL');
    if (!db) throw new Error('ACTION_SIGNING_SECRET is not set');
    return createHash('sha256').update(`stepq-action-links:${db}`).digest('base64url');
  },
  siteUrl: () => read('SITE_URL', 'https://stepq.in').replace(/\/+$/, ''),
  mailFrom: () => read('MAIL_FROM', 'StepQ <connect@stepq.in>'),
  founderInbox: () => read('FOUNDER_INBOX', 'connect@stepq.in'),
  ambassadorKitUrl: () => read('AMBASSADOR_KIT_URL'),
  /** 'outbox' = keep mail queued without sending; 'log' = mark it sent without sending (e2e). */
  mailTransport: () => read('MAIL_TRANSPORT'),
  resendApiKey: () => read('RESEND_API_KEY'),
  smtp: () => ({
    host: read('SMTP_HOST'),
    port: Number(read('SMTP_PORT', '465')),
    user: read('SMTP_USER'),
    pass: read('SMTP_PASS'),
  }),
};
