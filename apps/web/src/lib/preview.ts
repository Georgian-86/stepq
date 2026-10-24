/**
 * Preview builds (`NEXT_PUBLIC_PREVIEW_MODE=1`, inlined at build time) run without any
 * Firebase project: nothing initialises Firebase, callables are simulated in the browser
 * (see previewApi.ts), live data reads as empty, and every page is noindex.
 */
export const PREVIEW_MODE = process.env.NEXT_PUBLIC_PREVIEW_MODE === '1';

/** Replaces any "sent / emailed / recorded / we'll reply" sentence in a preview build. */
export const PREVIEW_NOTHING_SAVED = 'Preview: nothing was saved or emailed.';
/** Next to every UPI hand-off in a preview build: the payment is real, the record is not. */
export const PREVIEW_UPI_NOTE = "Preview: UPI payments made here are real and won't be recorded.";
