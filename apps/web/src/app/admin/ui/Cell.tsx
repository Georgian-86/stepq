import { prettyValue } from '@/lib/adminTables';
import type { Cell } from '@/server/admin/data';

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const IST = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  dateStyle: 'medium',
  timeStyle: 'short',
});
const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Stored codes shown as words (age groups, roles, topics…). */
const ENUM_COLUMNS = new Set([
  'gender',
  'age_group',
  'followers',
  'role',
  'topic',
  'source',
  'kind',
  'template',
  'status',
]);

const link = 'text-deep underline decoration-line underline-offset-2 hover:decoration-deep';

/** Only http(s) URLs become links. */
function safeUrl(value: string): string | null {
  try {
    const u = new URL(/^[a-z][\w+.-]*:/i.test(value) ? value : `https://${value}`);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

/** An Instagram handle (or profile URL) → its profile link and `@handle`. */
export function instagramLink(value: string): { href: string; handle: string } | null {
  const m =
    /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([A-Za-z0-9._]{1,30})\/?/i.exec(value.trim()) ??
    /^@?([A-Za-z0-9._]{1,30})$/.exec(value.trim());
  return m ? { href: `https://www.instagram.com/${m[1]}/`, handle: `@${m[1]}` } : null;
}

export function formatTime(value: string) {
  return IST.format(new Date(value));
}

/**
 * One value, shown for what it is: dates in India time, emails / phones / links / Instagram
 * handles clickable, codes as words, long text clamped (`full` shows all of it).
 */
export function CellView({
  column,
  value,
  full = false,
}: {
  column: string;
  value: Cell;
  full?: boolean;
}) {
  if (value === null || value === '') return <span className="text-muted/70">—</span>;
  if (ISO_TIME.test(value)) {
    return (
      <time dateTime={value} title={value} className="whitespace-nowrap tabular-nums">
        {formatTime(value)}
      </time>
    );
  }
  if (value === 'true' || value === 'false') return <span>{value === 'true' ? 'Yes' : 'No'}</span>;
  if (column === 'instagram') {
    const ig = instagramLink(value);
    if (ig) {
      return (
        <a
          href={ig.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${link} whitespace-nowrap`}
        >
          {ig.handle}
          <span className="sr-only"> on Instagram (opens in a new tab)</span>
        </a>
      );
    }
  }
  if (EMAIL.test(value)) {
    return (
      <a href={`mailto:${value}`} className={`${link} whitespace-nowrap`}>
        {value}
      </a>
    );
  }
  if (column === 'phone' && /^[+\d][\d\s-]{6,}$/.test(value)) {
    return (
      <a
        href={`tel:${value.replace(/[\s-]/g, '')}`}
        className={`${link} whitespace-nowrap tabular-nums`}
      >
        {value}
      </a>
    );
  }
  if (column === 'link' || /^https?:\/\//i.test(value)) {
    const href = safeUrl(value);
    if (href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={value}
          className={`${link} ${full ? 'break-all' : 'inline-block max-w-[220px] truncate align-bottom'}`}
        >
          {value.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')}
        </a>
      );
    }
  }
  if (column === 'amount' && /^\d+$/.test(value)) {
    return <span className="whitespace-nowrap tabular-nums">{INR.format(Number(value))}</span>;
  }
  if (ENUM_COLUMNS.has(column) && /^[\w.-]{1,40}$/.test(value)) {
    return <span className="whitespace-nowrap">{prettyValue(value)}</span>;
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) return <span className="tabular-nums">{value}</span>;
  if (full) return <span className="whitespace-pre-wrap break-words">{value}</span>;
  if (value.length <= 48 && !value.includes('\n'))
    return <span className="whitespace-nowrap">{value}</span>;
  return (
    <span
      title={value.length <= 600 ? value : undefined}
      className="line-clamp-2 min-w-[220px] max-w-[340px] break-words"
    >
      {value}
    </span>
  );
}
