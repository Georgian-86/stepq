const MAX = 200; // waitlistInput.source

/** `ref` and `utm_*` params of a query string, serialised for `waitlist.source` (spec §10a). */
export function waitlistSource(search: string): string | undefined {
  const kept = new URLSearchParams();
  for (const [k, v] of new URLSearchParams(search)) {
    if (v && (k === 'ref' || k.startsWith('utm_'))) kept.append(k, v);
  }
  const s = kept.toString();
  return s ? s.slice(0, MAX) : undefined;
}
