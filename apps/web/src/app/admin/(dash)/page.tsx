import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { Button } from '@/components/ui/Button';
import { TABLES, tableLabel } from '@/lib/adminTables';
import {
  asAdmin,
  columnsOf,
  countRows,
  listTables,
  readAdmin,
  readFacets,
  readOverview,
  readRow,
  readSite,
  readTable,
  type SiteStats,
  type TableInfo,
} from '@/server/admin/data';
import { ApiError } from '@/server/errors';
import { signedInUser } from '@/server/admin/session';
import { logout } from '../actions';
import { AddAdminForm } from '../AddAdminForm';
import { EditAdminForm } from '../EditAdminForm';
import { adminHref, chosenColumns, first, rowQuery, type Params } from '../params';
import { PanelGate } from '../ui/nav';
import { Overview, RANGES } from '../ui/Overview';
import { RowPanel } from '../ui/RowPanel';
import { StatsSkeleton, TableSkeleton } from '../ui/Skeletons';
import { TableView } from '../ui/TableView';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One view of the dashboard: Stats, or a table. The skeleton goes out at once and the view
 * streams in behind it. The boundary is keyed by table, so a page, sort or filter change keeps
 * the current rows on screen (dimmed by `NavContent`) instead of flashing a skeleton.
 */
export default async function AdminPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const t = first(params.t);
  return (
    <Suspense key={t} fallback={t ? <TableSkeleton title={tableLabel(t)} /> : <StatsSkeleton />}>
      <View params={params} />
    </Suspense>
  );
}

const notFound = (e: unknown) => {
  if (e instanceof ApiError) return null;
  throw e;
};

async function View({ params }: { params: Params }) {
  const user = await signedInUser();
  if (!user) redirect('/admin/login');
  const t = first(params.t);
  const edit = first(params.edit);
  const rowId = first(params.row).slice(0, 100);
  const page = Math.max(1, Math.floor(Number(first(params.p))) || 1);
  const rangeParam = Number(first(params.range));
  const range = (RANGES as readonly number[]).includes(rangeParam) ? rangeParam : 30;
  const q = rowQuery(params);
  // Stats: the website numbers are counted alongside, on a second connection, and stream in.
  let site: Promise<SiteStats | null> | undefined;
  const readSiteStats = () => {
    site = asAdmin(user, (c) => readSite(c, range)).then((s) => s ?? null);
    site.catch(() => {}); // awaited by the page; this only keeps an early failure from going unhandled
    return site;
  };
  if (!t) readSiteStats();

  // One transaction, which also checks admin access: about six round trips for a table.
  const view = await asAdmin(user, async (c) => {
    const columns = t ? await columnsOf(c, t).catch(notFound) : null;
    if (!columns) {
      const tables = await listTables(c);
      return { kind: 'overview', tables, overview: await readOverview(c, tables, range) } as const;
    }
    const def = TABLES[t];
    const data = await readTable(c, t, { ...q, page });
    const narrowed = Boolean(q.search || q.from || q.to || Object.keys(q.filters ?? {}).length);
    const current: TableInfo = {
      name: t,
      label: tableLabel(t),
      count: narrowed ? await countRows(c, t) : data.total,
      internal: Boolean(def?.internal),
    };
    const facetCols = [...(def?.filters ?? []), ...(def?.status ? [def.status.column] : [])];
    const facets = await readFacets(c, t, facetCols, q);
    const row = rowId ? await readRow(c, t, rowId) : undefined;
    const editing = t === 'admins' && edit && UUID.test(edit) ? await readAdmin(c, edit) : null;
    return { kind: 'table', current, data, facets, row, editing } as const;
  });

  if (!view) {
    return (
      <div className="mx-auto mt-10 max-w-[420px] rounded-card bg-white p-6 shadow-card">
        <h1 className="type-app-title mb-2">No admin access</h1>
        <p className="type-web-small mb-6 text-muted">
          {user.email} is signed in but is not an admin.
        </p>
        <form action={logout}>
          <Button type="submit">Sign out</Button>
        </form>
      </div>
    );
  }
  if (view.kind === 'overview') {
    return (
      <Overview
        data={view.overview}
        site={site ?? readSiteStats()}
        tables={view.tables}
        range={range}
      />
    );
  }
  return (
    <>
      <TableView
        params={params}
        table={view.current}
        data={view.data}
        shown={shownColumns(view.current, view.data.columns, chosenColumns(params))}
        facets={view.facets}
        page={page}
        selfId={user.id}
      >
        {view.current.name === 'admins' && (
          <AdminForms params={params} editing={view.editing} selfId={user.id} />
        )}
      </TableView>
      {rowId && view.row !== undefined && (
        <PanelGate>
          <RowPanel
            table={view.current.name}
            id={rowId}
            row={view.row}
            closeHref={adminHref(params, { row: undefined })}
          />
        </PanelGate>
      )}
    </>
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
