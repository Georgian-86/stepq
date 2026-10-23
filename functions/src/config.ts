import { defineSecret, defineString } from 'firebase-functions/params';

export const REGION = 'asia-south1';

export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
export const ACTION_SIGNING_SECRET = defineSecret('ACTION_SIGNING_SECRET');

export const MAIL_FROM = defineString('MAIL_FROM', { default: 'StepQ <hello@stepq.in>' });
export const FOUNDER_INBOX = defineString('FOUNDER_INBOX', { default: 'connect@stepq.in' });
export const SITE_URL = defineString('SITE_URL', { default: 'https://stepq.in' });
export const AMBASSADOR_KIT_URL = defineString('AMBASSADOR_KIT_URL', { default: '' });
/** 'outbox' = never call Resend (mail docs stay as the record). */
export const MAIL_TRANSPORT = defineString('MAIL_TRANSPORT', { default: '' });
