/**
 * How the admin dashboard shows each table: names, the columns shown by default (and in what
 * order), which columns get a filter, and the statuses an admin can set. Plain data, shared by
 * the server (queries, `stepq.set_status` checks) and the dashboard's client components. Tables
 * not listed here still show, with every column, under their own name.
 */

export type Tone = 'neutral' | 'info' | 'warn' | 'good' | 'bad';
export type StatusOption = { value: string; label: string; tone: Tone };
export type StatusDef = {
  column: string;
  /** Heading for the column and its controls. */
  label: string;
  options: StatusOption[];
  /** The status can be cleared (shown as "Not set"). */
  clearable?: boolean;
  /** Setting this value has an effect outside the dashboard, confirmed first. */
  confirm?: { value: string; message: string };
};
export type TableDef = {
  label: string;
  /** One line under the title. */
  blurb?: string;
  internal?: boolean;
  /** Columns shown by default, in this order. Every other column can be turned on. */
  columns?: string[];
  /** Columns with a filter menu (their distinct values). */
  filters?: string[];
  status?: StatusDef;
};

export const TABLES: Record<string, TableDef> = {
  waitlist: {
    label: 'Waitlist',
    blurb: 'People who joined the waitlist on the site.',
    columns: [
      'position',
      'name',
      'email',
      'username',
      'gender',
      'age_group',
      'country',
      'source',
      'created_at',
    ],
    filters: ['gender', 'age_group', 'country', 'source'],
  },
  founder_messages: {
    label: 'Colab reqs',
    blurb: 'Collaboration requests from "Collaborate with us".',
    columns: ['name', 'topic', 'email', 'phone', 'message', 'created_at'],
    filters: ['topic'],
  },
  team_applications: {
    label: 'Job applications',
    blurb: 'Applications from "Join the team", with résumés.',
    columns: ['name', 'status', 'role', 'email', 'phone', 'link', 'resume', 'why', 'created_at'],
    filters: ['role'],
    status: {
      column: 'status',
      label: 'Status',
      options: [
        { value: 'pending_review', label: 'Pending for review', tone: 'neutral' },
        { value: 'contacted', label: 'Contacted', tone: 'info' },
        { value: 'considered', label: 'Considered', tone: 'info' },
        { value: 'waiting_confirmation', label: 'Waiting confirmation', tone: 'warn' },
        { value: 'accepted', label: 'Accepted', tone: 'good' },
        { value: 'rejected', label: 'Rejected', tone: 'bad' },
      ],
    },
  },
  ambassador_applications: {
    label: 'Brand ambassadors',
    blurb: 'Brand ambassador applications.',
    columns: [
      'name',
      'status',
      'instagram',
      'followers',
      'city',
      'college_or_company',
      'email',
      'phone',
      'plan',
      'created_at',
    ],
    filters: ['city', 'followers'],
    status: {
      column: 'status',
      label: 'Status',
      options: [
        { value: 'pending', label: 'Pending', tone: 'neutral' },
        { value: 'contacted', label: 'Contacted', tone: 'info' },
        { value: 'approved', label: 'Approved', tone: 'good' },
        { value: 'rejected', label: 'Rejected', tone: 'bad' },
      ],
      confirm: {
        value: 'approved',
        message:
          'Approving emails them the ambassador welcome (the first time only). Approve this ambassador?',
      },
    },
  },
  backings: {
    label: 'Backings',
    blurb: 'UPI backings. Verified backers who opted in appear on the backers wall.',
    columns: ['name', 'status', 'amount', 'reference', 'phone', 'show_on_wall', 'created_at'],
    filters: ['show_on_wall'],
    status: {
      column: 'status',
      label: 'Status',
      options: [
        { value: 'pending', label: 'Pending', tone: 'warn' },
        { value: 'verified', label: 'Verified', tone: 'good' },
        { value: 'rejected', label: 'Rejected', tone: 'bad' },
      ],
      confirm: {
        value: 'verified',
        message: 'Verifying adds this backer to the public backers wall if they opted in. Verify?',
      },
    },
  },
  mail: {
    label: 'Mail',
    blurb: 'Every email the site sent or queued, and whether it needs a reply.',
    columns: ['to_addr', 'template', 'reply_status', 'status', 'attempts', 'created_at'],
    filters: ['template', 'status'],
    status: {
      column: 'reply_status',
      label: 'Reply',
      clearable: true,
      options: [
        { value: 'revert_pending', label: 'Revert pending', tone: 'warn' },
        { value: 'reverted', label: 'Reverted', tone: 'good' },
      ],
    },
  },
  admins: { label: 'Admins', columns: ['name', 'email', 'added_by', 'created_at'] },
  site_events: {
    label: 'Website clicks',
    internal: true,
    columns: ['kind', 'path', 'label', 'referrer', 'created_at'],
    filters: ['kind', 'path'],
  },
  stats: { label: 'Live counter', internal: true },
  rate_limits: { label: 'Rate limits', internal: true },
  requests: { label: 'Requests', internal: true },
  chunks: { label: 'Upload chunks', internal: true },
};

const COLUMN_LABELS: Record<string, string> = {
  id: 'ID',
  created_at: 'Received',
  updated_at: 'Updated',
  sent_at: 'Sent',
  approved_at: 'Approved',
  verified_at: 'Verified',
  to_addr: 'To',
  reply_status: 'Reply',
  status: 'Status',
  age_group: 'Age group',
  college_or_company: 'College / company',
  show_on_wall: 'On wall',
  wall_name: 'Wall name',
  resume: 'Résumé',
  resume_name: 'Résumé file',
  why: 'Why StepQ',
  user_id: 'User ID',
  added_by: 'Added by',
  last_error: 'Last error',
  reply_to: 'Reply to',
  amount: 'Amount (₹)',
};

export function columnLabel(name: string): string {
  if (COLUMN_LABELS[name]) return COLUMN_LABELS[name];
  const s = name.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const tableLabel = (name: string) => TABLES[name]?.label ?? name;

export function statusOption(def: StatusDef, value: string | null): StatusOption | undefined {
  return def.options.find((o) => o.value === value);
}

/** Readable text for a stored enum value such as `25_34` or `pending_review`. */
export function prettyValue(value: string): string {
  if (/^\d+_\d+$/.test(value)) return value.replace('_', '–');
  if (/^\d+k_\d+k$/.test(value)) return value.replace('_', '–');
  const s = value.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Pill and dot colours per tone (status colours always come with their label). */
export const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-page text-muted',
  info: 'bg-[#E8F0FC] text-[#1C4F96]',
  warn: 'bg-mango-soft text-[#7A4B00]',
  good: 'bg-leaf-soft text-deep',
  bad: 'bg-tomato-soft text-tomato-text',
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-muted',
  info: 'bg-[#2F6FD0]',
  warn: 'bg-mango',
  good: 'bg-leaf',
  bad: 'bg-tomato',
};
