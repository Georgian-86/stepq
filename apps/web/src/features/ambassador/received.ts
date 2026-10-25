import { PREVIEW_MODE, PREVIEW_NOTHING_SAVED } from '@/lib/preview';

/** Longest first name W11 shows from the URL (it is user-controlled). */
export const NAME_MAX = 60;

/** `/ambassadors/received?name=<firstName>`. */
export function receivedHref(firstName: string): string {
  return `/ambassadors/received?${new URLSearchParams({ name: firstName })}`;
}

/**
 * W11 sentence (`10:948`): "Thanks, {name}. StepQ will review your application. If you are
 * approved, you will get a congratulations email from StepQ." Without a name: "Thanks. …".
 */
export function receivedMessage(name: string | null): string {
  const first = name?.trim().slice(0, NAME_MAX).trim();
  const thanks = first ? `Thanks, ${first}.` : 'Thanks.';
  if (PREVIEW_MODE) return `${thanks} ${PREVIEW_NOTHING_SAVED}`;
  return `${thanks} StepQ will review your application. If you are approved, you will get a congratulations email from StepQ.`;
}
