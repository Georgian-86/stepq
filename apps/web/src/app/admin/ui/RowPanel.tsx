import { TABLES, columnLabel } from '@/lib/adminTables';
import type { Cell, Column } from '@/server/admin/data';
import { CellView } from './Cell';
import { EscapeLink, StatusButtons } from './client';
import { NavLink } from './nav';

/** Every field of one record, in a panel over the table (`?row=<id>`). */
export function RowPanel({
  table,
  id,
  row,
  closeHref,
}: {
  table: string;
  id: string;
  row: { columns: Column[]; values: Cell[] } | null;
  closeHref: string;
}) {
  const status = TABLES[table]?.status;
  const get = (name: string) => row?.values[row.columns.findIndex((c) => c.name === name)] ?? null;
  const title = get('name') ?? get('to_addr') ?? get('email') ?? 'Record';
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <NavLink
        href={closeHref}
        scroll={false}
        aria-label="Close details"
        tabIndex={-1}
        className="absolute inset-0 animate-fade-in bg-ink/30"
      />
      <aside
        aria-labelledby="row-title"
        className="relative flex h-full w-full max-w-[520px] animate-modal-in flex-col bg-white shadow-card"
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 edge-b">
          <div className="min-w-0">
            <p className="type-web-small text-muted">{TABLES[table]?.label ?? table}</p>
            <h2 id="row-title" className="type-app-heading break-words">
              {title}
            </h2>
          </div>
          <EscapeLink href={closeHref} />
        </header>
        {!row ? (
          <p className="type-web-body p-5 text-muted">This record no longer exists.</p>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {status && (
              <section className="mb-5">
                <h3 className="type-web-small-strong mb-2 text-muted">{status.label}</h3>
                <StatusButtons table={table} id={id} value={get(status.column)} />
              </section>
            )}
            <dl className="flex flex-col">
              {row.columns.map((col, i) =>
                col.name === status?.column ? null : (
                  <div
                    key={col.name}
                    className="grid gap-1 py-2.5 edge-b last:shadow-none sm:grid-cols-[150px_1fr] sm:gap-3"
                  >
                    <dt className="type-web-small text-muted">{columnLabel(col.name)}</dt>
                    <dd className="type-web-small min-w-0 break-words">
                      {table === 'team_applications' && col.name === 'resume' ? (
                        <a
                          href={`/admin/resume/${encodeURIComponent(id)}`}
                          className="text-deep underline underline-offset-2"
                        >
                          {`Download ${get('resume_name') ?? 'résumé'} (${row.values[i]?.replace(' file', '')})`}
                        </a>
                      ) : (
                        <CellView column={col.name} value={row.values[i] ?? null} full />
                      )}
                    </dd>
                  </div>
                ),
              )}
            </dl>
          </div>
        )}
      </aside>
    </div>
  );
}
