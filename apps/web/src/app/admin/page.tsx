import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { TABLES } from '@/lib/adminTables';
import {
  asUser,
  listTables,
  readAdmin,
  readFacets,
  readOverview,
  readRow,
  readTable,
  type TableInfo,
} from '@/server/admin/data';
import { adminState } from '@/server/admin/session';
import { logout } from './actions';
import { AddAdminForm } from './AddAdminForm';
import { EditAdminForm } from './EditAdminForm';
import { adminHref, chosenColumns, first, rowQuery, type Params } from './params';
import { AdminIcon } from './ui/AdminIcon';
import { Overview, RANGES } from './ui/Overview';
import { RowPanel } from './ui/RowPanel';
import { TableView } from './ui/TableView';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const state = await adminState();
  if (state.kind === 'signed-out') redirect('/admin/login');
  if (state.kind === 'not-admin') {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[420px] flex-col justify-center px-4">
        <div className="rounded-card bg-white p-6 shadow-card">
          <h1 className="type-app-title mb-2">No admin access</h1>
          <p className="type-web-small mb-6 text-muted">
            {state.user.email} is signed in but is not an admin.
          </p>
          <form action={logout}>
            <Button type="submit">Sign out</Button>
          </form>
        </div>
      </main>
    );
  }

  const params = await searchParams;
  const t = first(params.t);
  const edit = first(params.edit);
  const rowId = first(params.row).slice(0, 100);
  const page = Math.max(1, Math.floor(Number(first(params.p))) || 1);
  const rangeParam = Number(first(params.range));
  const range = (RANGES as readonly number[]).includes(rangeParam) ? rangeParam : 30;
  const q = rowQuery(params);

  const view = await asUser(state.user, async (c) => {
    const tables = await listTables(c);
    const current = t ? tables.find((x) => x.name === t) : undefined;
    if (!current)
      return { kind: 'overview', tables, overview: await readOverview(c, tables, range) } as const;
    const def = TABLES[current.name];
    const data = await readTable(c, current.name, { ...q, page });
    const facetCols = [...(def?.filters ?? []), ...(def?.status ? [def.status.column] : [])];
    const facets = await readFacets(c, current.name, facetCols, q);
    const row = rowId ? await readRow(c, current.name, rowId) : undefined;
    const editing =
      current.name === 'admins' && edit && UUID.test(edit) ? await readAdmin(c, edit) : null;
    return { kind: 'table', tables, current, data, facets, row, editing } as const;
  });

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-white/95 px-4 py-3 backdrop-blur edge-b md:px-6">
        <Link href="/admin" className="type-app-subheading flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-flex size-7 items-center justify-center rounded-[8px] bg-deep text-[13px] font-bold text-white"
          >
            S
          </span>
          StepQ admin
        </Link>
        <div className="flex items-center gap-1 sm:gap-3">
          <Link
            href={adminHref({ t: 'admins', edit: state.user.id })}
            className="type-web-small hidden max-w-[220px] truncate text-muted underline-offset-2 hover:underline sm:inline"
          >
            {state.user.email}
          </Link>
          <form action={logout}>
            <Button type="submit" variant="text">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <Sidebar tables={view.tables} current={view.kind === 'table' ? view.current.name : null} />

        <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-7">
          {view.kind === 'overview' ? (
            <Overview data={view.overview} tables={view.tables} range={range} />
          ) : (
            <>
              <TableView
                params={params}
                table={view.current}
                data={view.data}
                shown={shownColumns(view.current, view.data.columns, chosenColumns(params))}
                facets={view.facets}
                page={page}
                selfId={state.user.id}
              >
                {view.current.name === 'admins' && (
                  <AdminForms params={params} editing={view.editing} selfId={state.user.id} />
                )}
              </TableView>
              {rowId && view.row !== undefined && (
                <RowPanel
                  table={view.current.name}
                  id={rowId}
                  row={view.row}
                  closeHref={adminHref(params, { row: undefined })}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/** The table's chosen columns, else its default set, else every column. */
function shownColumns<C extends { name: string }>(
  table: TableInfo,
  columns: C[],
  chosen: string[],
): C[] {
  const pick = (names: string[]) =>
    names.map((n) => columns.find((c) => c.name === n)).filter((c): c is C => Boolean(c));
  if (chosen.length) {
    const order = TABLES[table.name]?.columns ?? [];
    const ranked = [...chosen].sort(
      (a, b) =>
        (order.includes(a)
          ? order.indexOf(a)
          : order.length + columns.findIndex((c) => c.name === a)) -
        (order.includes(b)
          ? order.indexOf(b)
          : order.length + columns.findIndex((c) => c.name === b)),
    );
    const shown = pick(ranked);
    if (shown.length) return shown;
  }
  const defaults = TABLES[table.name]?.columns;
  const shown = defaults ? pick(defaults) : [];
  return shown.length ? shown : columns;
}

function AdminForms({
  params,
  editing,
  selfId,
}: {
  params: Params;
  editing: Awaited<ReturnType<typeof readAdmin>>;
  selfId: string;
}) {
  const saved = first(params.saved);
  const deleted = first(params.deleted);
  return (
    <>
      {(saved || deleted) && !editing && (
        <p role="status" className="type-web-small mb-3 text-deep">
          {deleted ? 'Admin deleted.' : 'Changes saved.'}
        </p>
      )}
      {editing ? (
        <EditAdminForm key={editing.userId} admin={editing} isSelf={editing.userId === selfId} />
      ) : (
        <AddAdminForm />
      )}
    </>
  );
}

function Sidebar({ tables, current }: { tables: TableInfo[]; current: string | null }) {
  const main = tables.filter((x) => !x.internal);
  const system = tables.filter((x) => x.internal);
  const item = (on: boolean) =>
    `type-web-small flex min-h-[40px] items-center justify-between gap-3 whitespace-nowrap rounded-[10px] px-3 transition-colors ${
      on ? 'bg-deep text-white' : 'text-ink hover:bg-page'
    }`;
  const badge = (on: boolean) =>
    `rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums ${on ? 'bg-white/20 text-white' : 'bg-page text-muted'}`;
  return (
    <nav
      aria-label="Dashboard"
      className="bg-white px-2 py-3 edge-b md:sticky md:top-[61px] md:h-[calc(100dvh-61px)] md:w-[248px] md:shrink-0 md:overflow-y-auto md:shadow-[inset_-1.5px_0_0_var(--color-line)]"
    >
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        <li>
          <Link
            href="/admin"
            aria-current={current === null ? 'page' : undefined}
            className={item(current === null)}
          >
            <span className="flex items-center gap-2">
              <AdminIcon name="chart" className="size-4" />
              Stats
            </span>
          </Link>
        </li>
        <li aria-hidden="true" className="type-label hidden px-3 pt-4 pb-1 text-muted md:block">
          Records
        </li>
        {main.map((x) => (
          <li key={x.name}>
            <Link
              href={`/admin?t=${encodeURIComponent(x.name)}`}
              aria-current={x.name === current ? 'page' : undefined}
              className={item(x.name === current)}
            >
              <span>{x.label}</span>
              <span className={badge(x.name === current)}>{x.count.toLocaleString('en-IN')}</span>
            </Link>
          </li>
        ))}
        {system.length > 0 && (
          <li aria-hidden="true" className="type-label hidden px-3 pt-4 pb-1 text-muted md:block">
            System
          </li>
        )}
        {system.map((x) => (
          <li key={x.name}>
            <Link
              href={`/admin?t=${encodeURIComponent(x.name)}`}
              aria-current={x.name === current ? 'page' : undefined}
              className={`${item(x.name === current)} ${x.name === current ? '' : 'text-muted'}`}
            >
              <span>{x.label}</span>
              <span className={badge(x.name === current)}>{x.count.toLocaleString('en-IN')}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
