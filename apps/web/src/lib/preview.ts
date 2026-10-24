/**
 * Preview builds (`NEXT_PUBLIC_PREVIEW_MODE=1`, inlined at build time) run without any
 * Firebase project: nothing initialises Firebase, callables are simulated in the browser
 * (see previewApi.ts), live data reads as empty, and every page is noindex.
 */
export const PREVIEW_MODE = process.env.NEXT_PUBLIC_PREVIEW_MODE === '1';
