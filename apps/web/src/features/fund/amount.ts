import { backingInput } from '@stepq/schemas';
import { PREVIEW_MODE, PREVIEW_NOTHING_SAVED, PREVIEW_UPI_NOTE } from '@/lib/preview';

const amountSchema = backingInput.shape.amount;
const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** The custom amount field's text as a number (commas and spaces ignored); `undefined` if not a number. */
export function parseAmount(text: string): number | undefined {
  const s = text.replace(/[\s,]/g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return undefined;
  return Number(s);
}

/** `₹1,001`, `₹1,00,000` (Indian grouping). */
export function formatInr(amount: number): string {
  return `₹${inr.format(amount)}`;
}

/** True when the schema accepts the amount (whole rupees, 1 – 1,00,000). */
export function isValidAmount(amount: unknown): amount is number {
  return amountSchema.safeParse(amount).success;
}

/** W06 button: `Pay ₹{amount} with UPI` once a valid amount is chosen. */
export function payLabel(amount: unknown): string {
  return isValidAmount(amount) ? `Pay ${formatInr(amount)} with UPI` : 'Pay with UPI';
}

export function thankYouHref(amount: number): string {
  return `/fund/thank-you?amount=${amount}`;
}

/** W08 sentence (`10:737`); the amount is left out unless `?amount=` is a valid whole number. */
export function thankYouMessage(amountParam: string | null): string {
  if (PREVIEW_MODE) return `${PREVIEW_NOTHING_SAVED} ${PREVIEW_UPI_NOTE}`;
  const n = amountParam && /^\d+$/.test(amountParam) ? Number(amountParam) : undefined;
  const of = isValidAmount(n) ? ` of ${formatInr(n)}` : '';
  return `We have recorded your payment${of}. Once StepQ verifies it, your name will join the sponsor wall if you chose to show it.`;
}
