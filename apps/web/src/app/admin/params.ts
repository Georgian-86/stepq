import type { RowQuery } from '@/server/admin/data';

/**
 * The dashboard's URL state. Filters are `f.<column>=<value>`: an empty value means "not set",
 * and `__all` (a filter menu's first option) means no filter.
 */
export const ALL = '__all';

export type Params = Record<string, string | string[] | undefined>;

export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export function rowQuery(params: Params): RowQuery {
  const filters: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k.startsWith('f.') && k.length > 2 && v !== undefined && first(v) !== ALL) {
      filters[k.slice(2)] = first(v);
    }
  }
  const dir = first(params.dir);
  return {
    search: first(params.q).trim().slice(0, 200),
    filters,
    from: first(params.from),
    to: first(params.to),
    sort: first(params.sort) || undefined,
    dir: dir === 'asc' || dir === 'desc' ? dir : undefined,
  };
}

/** `/admin?…` from `base` with `changes` applied (undefined removes a key). */
export function adminHref(base: Params, changes: Params = {}): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...base, ...changes })) {
    for (const value of v === undefined ? [] : Array.isArray(v) ? v : [v]) {
      if (value || k.startsWith('f.')) s.append(k, value);
    }
  }
  const qs = s.toString();
  return qs ? `/admin?${qs}` : '/admin';
}

/** The params that select rows (table, search, filters, dates, sort), without paging or panels. */
export function listParams(params: Params): Params {
  const out: Params = {};
  for (const [k, v] of Object.entries(params)) {
    if (k.startsWith('f.') && first(v) === ALL) continue;
    if (['t', 'q', 'from', 'to', 'sort', 'dir', 'cols'].includes(k) || k.startsWith('f.')) {
      out[k] = v;
    }
  }
  return out;
}

/** Chosen columns: `cols` given once per column (a form) or comma-separated (a link). */
export function chosenColumns(params: Params): string[] {
  const v = params.cols;
  return (v === undefined ? [] : Array.isArray(v) ? v : [v])
    .flatMap((x) => x.split(','))
    .filter(Boolean);
}
