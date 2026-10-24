import { ROLE_LABELS, ROLES } from '@stepq/schemas';
import { PREVIEW_MODE, PREVIEW_NOTHING_SAVED } from '@/lib/preview';

type Role = (typeof ROLES)[number];

const isRole = (r: unknown): r is Role => (ROLES as readonly unknown[]).includes(r);

/** sessionStorage key for the email W05 shows (kept out of the URL). */
export const SENT_KEY = 'stepq.teamApplication';

/** `/join-the-team/sent?name=<firstName>&role=<role>`. */
export function sentHref(firstName: string, role: Role): string {
  return `/join-the-team/sent?${new URLSearchParams({ name: firstName, role })}`;
}

/**
 * W05 sentence (`10:296`): "Thanks, {name}. StepQ will review your application for {role} and
 * reply to {email}." Missing parts are left out rather than shown empty.
 */
export function sentMessage({
  name,
  role,
  email,
}: {
  name: string | null;
  role: string | null;
  email: string | null;
}): string {
  const first = name?.trim();
  const thanks = first ? `Thanks, ${first}.` : 'Thanks.';
  if (PREVIEW_MODE) return `${thanks} ${PREVIEW_NOTHING_SAVED}`;
  const forRole = isRole(role) ? ` for ${ROLE_LABELS[role]}` : '';
  const reply = email ? `reply to ${email}` : 'reply by email';
  return `${thanks} StepQ will review your application${forRole} and ${reply}.`;
}
