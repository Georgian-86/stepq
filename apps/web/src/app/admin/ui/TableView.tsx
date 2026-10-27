import Link from 'next/link';
import type { ReactNode } from 'react';
import { TABLES, TONE_DOT, columnLabel, prettyValue } from '@/lib/adminTables';
import {
  PAGE_SIZE,
  type Column,
  type FacetValue,
  type TableInfo,
  type TablePage,
} from '@/server/admin/data';
import { ALL, adminHref, first, listParams, type Params } from '../params';
import { AdminIcon } from './AdminIcon';
import { CellView } from './Cell';
import { AutoForm, Popover, StatusSelect } from './client';

type Props = {
  params: Params;
  table: TableInfo;
  data: TablePage;
  /** Columns shown, in order. */
  shown: Column[];
  facets: Record<string, FacetValue[]>;
  page: number;
  selfId: string;
  /** Rendered above the table (admin forms). */
  children?: ReactNode;
};

const control =
  'type-web-small min-h-[40px] rounded-[10px] bg-white px-3 text-ink edge hover:bg-page focus-visible:outline-2 focus-visible:outline-deep';

export function TableView({ params, table, data, shown, facets, page, selfId, children }: Props) {
  const def = TABLES[table.name];
  const status = def?.status;
  const base = listParams(params);
  const filterCols = (def?.filters ?? []).filter((name) => facets[name]);
  const activeFilters = Object.keys(base).filter((k) => k.startsWith('f.'));
  const narrowed = Boolean(
    first(base.q) || first(base.from) || first(base.to) || activeFilters.length,
  );
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  const hasDates = data.columns.some((c) => c.name === 'created_at');
  const statusKey = status ? `f.${status.column}` : '';
  const index = new Map(data.columns.map((c, i) => [c.name, i]));
  const nameIdx = index.get('name') ?? index.get('to_addr') ?? index.get('email');
  const sort = first(params.sort);
  const dir = first(params.dir) === 'asc' ? 'asc' : 'desc';
  const from = (page - 1) * PAGE_SIZE;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="type-app-title">{table.label}</h2>
          <p className="type-web-small text-muted">
            {def?.blurb ? `${def.blurb} ` : ''}
            <span className="whitespace-nowrap">
              {table.count.toLocaleString('en-IN')} {table.count === 1 ? 'record' : 'records'}
            </span>
          </p>
        </div>
        <DownloadMenu
          params={base}
          table={table}
          columns={data.columns}
          shown={shown}
          matching={data.total}
          narrowed={narrowed}
        />
      </div>

      {status && facets[status.column] && (
        <nav
          aria-label={`${status.label} filter`}
          className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1"
        >
          <StatusTab
            href={adminHref(base, { [statusKey]: undefined })}
            on={base[statusKey] === undefined}
            label="All"
            count={facets[status.column]!.reduce((a, b) => a + b.count, 0)}
          />
          {[
            ...status.options,
            ...(status.clearable
              ? [{ value: '', label: 'Not set', tone: 'neutral' as const }]
              : []),
          ].map((o) => (
            <StatusTab
              key={o.value || 'none'}
              href={adminHref(base, { [statusKey]: o.value })}
              on={base[statusKey] !== undefined && first(base[statusKey]) === o.value}
              label={o.label}
              dot={TONE_DOT[o.tone]}
              count={facets[status.column]!.find((f) => (f.value ?? '') === o.value)?.count ?? 0}
            />
          ))}
        </nav>
      )}

      <div className="mb-3 flex flex-wrap items-start gap-2">
        <AutoForm action="/admin" className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input type="hidden" name="t" value={table.name} />
          {Object.entries(base).map(([k, v]) =>
            ['sort', 'dir', 'cols', statusKey].includes(k) && v !== undefined
              ? [v]
                  .flat()
                  .map((x, i) => <input key={`${k}${i}`} type="hidden" name={k} value={x} />)
              : null,
          )}
          <label className="relative flex min-w-[200px] flex-1 items-center sm:max-w-[300px]">
            <span className="sr-only">Search {table.label}</span>
            <AdminIcon
              name="search"
              className="pointer-events-none absolute left-3 size-4 text-muted"
            />
            <input
              name="q"
              type="search"
              defaultValue={first(base.q)}
              placeholder={`Search ${table.label.toLowerCase()}`}
              className={`${control} w-full pl-9`}
            />
          </label>
          {filterCols.map((name) => (
            <label key={name} className="flex items-center">
              <span className="sr-only">{columnLabel(name)}</span>
              <select
                name={`f.${name}`}
                defaultValue={base[`f.${name}`] === undefined ? ALL : first(base[`f.${name}`])}
                className={`${control} pr-8 ${base[`f.${name}`] !== undefined ? 'bg-mint font-bold [--edge:var(--color-deep)]' : ''}`}
              >
                <option value={ALL}>{columnLabel(name)}: all</option>
                {facets[name]!.map((f) => (
                  <option key={f.value ?? '__null'} value={f.value ?? ''}>
                    {f.value === null
                      ? 'Not set'
                      : name === 'show_on_wall'
                        ? f.value === 'true'
                          ? 'Yes'
                          : 'No'
                        : prettyValue(f.value)}{' '}
                    ({f.count})
                  </option>
                ))}
              </select>
            </label>
          ))}
          {hasDates && (
            <span className="flex items-center gap-1.5">
              <label className="flex items-center">
                <span className="sr-only">Received from</span>
                <input
                  type="date"
                  name="from"
                  defaultValue={first(base.from)}
                  className={`${control} w-[150px]`}
                  aria-describedby="date-hint"
                />
              </label>
              <span aria-hidden="true" className="text-muted">
                –
              </span>
              <label className="flex items-center">
                <span className="sr-only">Received to</span>
                <input
                  type="date"
                  name="to"
                  defaultValue={first(base.to)}
                  className={`${control} w-[150px]`}
                />
              </label>
              <span id="date-hint" className="sr-only">
                Dates are in India time.
              </span>
            </span>
          )}
          <button type="submit" className={`${control} type-web-small-strong text-deep`}>
            Apply
          </button>
          {narrowed && (
            <Link
              href={adminHref({ t: table.name, sort: base.sort, dir: base.dir, cols: base.cols })}
              className="type-web-small-strong px-2 text-tomato-text hover:underline"
            >
              Clear filters
            </Link>
          )}
        </AutoForm>
        <ColumnsMenu params={base} table={table} columns={data.columns} shown={shown} />
      </div>

      {children}

      <div className="overflow-hidden rounded-card bg-white shadow-card">
        <div className="max-h-[calc(100dvh-260px)] min-h-[200px] overflow-auto">
          <table className="type-web-small w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-white">
              <tr>
                {shown.map((col, i) => {
                  const on = sort === col.name;
                  const next = on && dir === 'desc' ? 'asc' : 'desc';
                  return (
                    <th
                      key={col.name}
                      scope="col"
                      aria-sort={on ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`whitespace-nowrap px-3 py-2.5 font-bold text-muted edge-b ${i === 0 ? 'sticky left-0 z-10 bg-white' : ''}`}
                    >
                      {col.type === 'bytea' ? (
                        columnLabel(col.name)
                      ) : (
                        <Link
                          href={adminHref(base, { sort: col.name, dir: next, p: undefined })}
                          scroll={false}
                          className={`inline-flex items-center gap-1 hover:text-ink ${on ? 'text-ink' : ''}`}
                        >
                          {columnLabel(col.name)}
                          <AdminIcon
                            name={on ? (dir === 'asc' ? 'sortUp' : 'sortDown') : 'sort'}
                            className={`size-3.5 ${on ? '' : 'opacity-40'}`}
                          />
                        </Link>
                      )}
                    </th>
                  );
                })}
                <th
                  scope="col"
                  className="sticky right-0 bg-white shadow-[-10px_0_10px_-10px_rgb(13_41_26/0.25)] px-3 py-2.5 edge-b"
                >
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {data.rows.length === 0 && (
                <tr>
                  <td colSpan={shown.length + 1} className="px-3 py-14 text-center text-muted">
                    {narrowed ? 'No records match these filters.' : 'No records yet.'}
                  </td>
                </tr>
              )}
              {data.rows.map((row, r) => {
                const id = data.ids[r];
                const name = (nameIdx !== undefined ? row[nameIdx] : null) ?? id ?? 'this record';
                return (
                  <tr
                    key={id ?? r}
                    className="group align-middle transition-colors hover:bg-mint/60 [&:not(:last-child)>td]:edge-b"
                  >
                    {shown.map((col, i) => {
                      const value = row[index.get(col.name)!] ?? null;
                      return (
                        <td
                          key={col.name}
                          className={`px-3 py-2.5 ${i === 0 ? 'sticky left-0 bg-white group-hover:bg-[#f1f8f3]' : ''}`}
                        >
                          {status && col.name === status.column && id ? (
                            <StatusSelect table={table.name} id={id} value={value} name={name} />
                          ) : table.name === 'team_applications' && col.name === 'resume' && id ? (
                            <a
                              href={`/admin/resume/${encodeURIComponent(id)}`}
                              className="inline-flex items-center gap-1 whitespace-nowrap text-deep underline underline-offset-2"
                            >
                              {row[index.get('resume_name') ?? -1] ?? 'Résumé'}
                              <span className="text-muted no-underline">
                                ({value?.replace(' file', '')})
                              </span>
                            </a>
                          ) : (
                            <CellView column={col.name} value={value} />
                          )}
                        </td>
                      );
                    })}
                    <td className="sticky right-0 bg-white shadow-[-10px_0_10px_-10px_rgb(13_41_26/0.25)] px-2 py-1.5 text-right group-hover:bg-[#f1f8f3]">
                      {id &&
                        (table.name === 'admins' ? (
                          <Link
                            href={adminHref({ t: 'admins', edit: id })}
                            className="type-web-small-strong inline-flex min-h-[32px] items-center whitespace-nowrap px-2 text-deep hover:underline"
                          >
                            {id === selfId ? 'Edit (you)' : 'Edit'}
                          </Link>
                        ) : (
                          <Link
                            href={adminHref(params, { row: id })}
                            scroll={false}
                            className="type-web-small-strong inline-flex min-h-[32px] items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-deep hover:bg-leaf-soft"
                          >
                            View
                            <span className="sr-only"> {name}</span>
                          </Link>
                        ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="type-web-small flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-muted [box-shadow:inset_0_1.5px_0_var(--color-line)]">
          <span className="tabular-nums">
            {data.total === 0
              ? '0 records'
              : `${(from + 1).toLocaleString('en-IN')}–${Math.min(from + PAGE_SIZE, data.total).toLocaleString('en-IN')} of ${data.total.toLocaleString('en-IN')}${narrowed ? ' matching' : ''}`}
          </span>
          {pages > 1 && (
            <nav aria-label="Pages" className="flex items-center gap-2">
              <PageLink
                href={page > 1 ? adminHref(base, { p: String(page - 1) }) : null}
                label="Previous"
              />
              <span className="tabular-nums">
                Page {page} of {pages}
              </span>
              <PageLink
                href={page < pages ? adminHref(base, { p: String(page + 1) }) : null}
                label="Next"
              />
            </nav>
          )}
        </div>
      </div>
    </>
  );
}

function PageLink({ href, label }: { href: string | null; label: string }) {
  const cls =
    'type-web-small-strong inline-flex min-h-[36px] items-center rounded-[10px] px-3 edge';
  return href ? (
    <Link href={href} className={`${cls} bg-white text-deep hover:bg-page`}>
      {label}
    </Link>
  ) : (
    <span aria-disabled="true" className={`${cls} text-muted/60`}>
      {label}
    </span>
  );
}

function StatusTab({
  href,
  on,
  label,
  count,
  dot,
}: {
  href: string;
  on: boolean;
  label: string;
  count: number;
  dot?: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={on ? 'page' : undefined}
      className={`type-web-small-strong inline-flex min-h-[36px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 transition-colors ${
        on ? 'bg-ink text-white' : 'bg-white text-ink edge hover:bg-page'
      }`}
    >
      {dot && <span aria-hidden="true" className={`size-2 rounded-full ${dot}`} />}
      {label}
      <span className={`tabular-nums ${on ? 'text-white/75' : 'text-muted'}`}>{count}</span>
    </Link>
  );
}

function ColumnsMenu({
  params,
  table,
  columns,
  shown,
}: {
  params: Params;
  table: TableInfo;
  columns: Column[];
  shown: Column[];
}) {
  const on = new Set(shown.map((c) => c.name));
  const defaults = TABLES[table.name]?.columns;
  return (
    <Popover
      summary={
        <>
          <AdminIcon name="columns" className="size-4" />
          Columns
          <span className="font-normal text-muted tabular-nums">
            {shown.length}/{columns.length}
          </span>
        </>
      }
    >
      <form action="/admin" className="flex flex-col gap-3">
        {Object.entries(params).map(([k, v]) =>
          k !== 'cols' && v !== undefined
            ? [v].flat().map((x, i) => <input key={`${k}${i}`} type="hidden" name={k} value={x} />)
            : null,
        )}
        <fieldset>
          <legend className="type-web-small-strong mb-2">Show columns</legend>
          <div className="grid max-h-[280px] grid-cols-2 gap-x-3 gap-y-1 overflow-auto">
            {columns.map((c) => (
              <label
                key={c.name}
                className="type-web-small flex min-h-[32px] cursor-pointer items-center gap-2 rounded-[8px] px-1.5 hover:bg-page"
              >
                <input
                  type="checkbox"
                  name="cols"
                  value={c.name}
                  defaultChecked={on.has(c.name)}
                  className="size-4 accent-[var(--color-deep)]"
                />
                <span className="truncate">{columnLabel(c.name)}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex items-center justify-between gap-2">
          <Link
            href={adminHref(params, { cols: undefined })}
            className="type-web-small-strong text-muted hover:text-ink"
          >
            {defaults ? 'Reset' : 'Show all'}
          </Link>
          <button
            type="submit"
            className="type-web-small-strong min-h-[36px] rounded-full bg-deep px-4 text-white"
          >
            Apply
          </button>
        </div>
      </form>
    </Popover>
  );
}

function DownloadMenu({
  params,
  table,
  columns,
  shown,
  matching,
  narrowed,
}: {
  params: Params;
  table: TableInfo;
  columns: Column[];
  shown: Column[];
  matching: number;
  narrowed: boolean;
}) {
  const on = new Set(shown.map((c) => c.name));
  const radio =
    'flex min-h-[36px] cursor-pointer items-start gap-2 rounded-[8px] px-1.5 py-1.5 hover:bg-page';
  return (
    <Popover
      summary={
        <>
          <AdminIcon name="download" className="size-4" />
          Download
        </>
      }
    >
      <form action="/admin/export" method="get" className="flex flex-col gap-4">
        <input type="hidden" name="t" value={table.name} />
        {Object.entries(params).map(([k, v]) =>
          ['q', 'from', 'to', 'sort', 'dir'].includes(k) || k.startsWith('f.')
            ? [v]
                .flat()
                .map((x, i) => <input key={`${k}${i}`} type="hidden" name={k} value={x ?? ''} />)
            : null,
        )}
        <fieldset>
          <legend className="type-web-small-strong mb-1.5">Rows</legend>
          <label className={radio}>
            <input
              type="radio"
              name="scope"
              value="filtered"
              defaultChecked={narrowed}
              disabled={!narrowed}
              className="mt-0.5 accent-[var(--color-deep)]"
            />
            <span className="type-web-small">
              Only rows matching the current filters
              <span className="block text-muted">
                {narrowed ? `${matching.toLocaleString('en-IN')} rows` : 'No filters applied'}
              </span>
            </span>
          </label>
          <label className={radio}>
            <input
              type="radio"
              name="scope"
              value="all"
              defaultChecked={!narrowed}
              className="mt-0.5 accent-[var(--color-deep)]"
            />
            <span className="type-web-small">
              Every row
              <span className="block text-muted">{table.count.toLocaleString('en-IN')} rows</span>
            </span>
          </label>
        </fieldset>
        <fieldset>
          <legend className="type-web-small-strong mb-1.5">Columns</legend>
          <div className="grid max-h-[180px] grid-cols-2 gap-x-3 gap-y-0.5 overflow-auto">
            {columns.map((c) => (
              <label
                key={c.name}
                className="type-web-small flex min-h-[30px] cursor-pointer items-center gap-2 rounded-[8px] px-1.5 hover:bg-page"
              >
                <input
                  type="checkbox"
                  name="col"
                  value={c.name}
                  defaultChecked={on.has(c.name)}
                  className="size-4 accent-[var(--color-deep)]"
                />
                <span className="truncate">{columnLabel(c.name)}</span>
              </label>
            ))}
          </div>
          <p className="type-web-small mt-1 text-muted">
            Résumé files download one by one from each row.
          </p>
        </fieldset>
        <fieldset>
          <legend className="type-web-small-strong mb-1.5">Format</legend>
          <div className="flex gap-2">
            {[
              ['csv', 'CSV', 'Excel, Google Sheets'],
              ['json', 'JSON', 'For developers'],
            ].map(([value, label, hint], i) => (
              <label
                key={value}
                className="flex flex-1 cursor-pointer flex-col rounded-[10px] px-3 py-2 edge has-[:checked]:bg-mint has-[:checked]:[--edge:var(--color-deep)]"
              >
                <span className="type-web-small-strong flex items-center gap-2">
                  <input
                    type="radio"
                    name="format"
                    value={value}
                    defaultChecked={i === 0}
                    className="accent-[var(--color-deep)]"
                  />
                  {label}
                </span>
                <span className="type-web-small text-muted">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="submit"
          className="type-web-small-strong inline-flex min-h-[40px] items-center justify-center gap-2 rounded-full bg-deep px-4 text-white"
        >
          <AdminIcon name="download" className="size-4" />
          Download
        </button>
      </form>
    </Popover>
  );
}
