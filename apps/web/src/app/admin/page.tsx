import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import {
  PAGE_SIZE,
  asUser,
  listTables,
  readAdmin,
  readTable,
  type Cell,
} from '@/server/admin/data';
import { adminState } from '@/server/admin/session';
import { logout } from './actions';
import { AddAdminForm } from './AddAdminForm';
import { EditAdminForm } from './EditAdminForm';

export const dynamic = 'force-dynamic';

type Search = {
  t?: string;
  p?: string;
  q?: string;
  edit?: string;
  saved?: string;
  deleted?: string;
};
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function href(params: Search): string {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) s.set(k, v);
  const qs = s.toString();
  return qs ? `/admin?${qs}` : '/admin';
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<Search> }) {
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

  const { t, p, q = '', edit, saved, deleted } = await searchParams;
  const search = q.trim().slice(0, 200);
  const page = Math.max(1, Math.floor(Number(p)) || 1);
  const { tables, current, data, editing } = await asUser(state.user, async (c) => {
    const tables = await listTables(c);
    const current = tables.find((x) => x.name === t) ?? tables[0];
    const data = current ? await readTable(c, current.name, { page, search }) : null;
    const editing =
      current?.name === 'admins' && edit && UUID.test(edit) ? await readAdmin(c, edit) : null;
    return { tables, current, data, editing };
  });
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const resumeCol = data?.columns.findIndex((col) => col.name === 'resume') ?? -1;
  const managingAdmins = current?.name === 'admins';

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 edge-b md:px-6">
        <h1 className="type-app-subheading">StepQ admin</h1>
        <div className="flex items-center gap-3">
          <Link
            href={href({ t: 'admins', edit: state.user.id })}
            className="type-web-small text-muted underline-offset-2 hover:underline"
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
        <nav aria-label="Tables" className="bg-white px-2 py-3 md:w-[240px] md:shrink-0 md:edge">
          <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {tables.map((x, i) => (
              <li key={x.name} className={x.internal && !tables[i - 1]?.internal ? 'md:mt-4' : ''}>
                <Link
                  href={href({ t: x.name })}
                  aria-current={x.name === current?.name ? 'page' : undefined}
                  className={`type-web-small flex items-center justify-between gap-3 whitespace-nowrap rounded-[10px] px-3 py-2 ${
                    x.name === current?.name ? 'bg-deep text-white' : 'hover:bg-page'
                  } ${x.internal && x.name !== current?.name ? 'text-muted' : ''}`}
                >
                  <span>{x.label}</span>
                  <span className="tabular-nums opacity-80">{x.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1 px-4 py-5 md:px-6">
          {!current || !data ? (
            <p className="type-web-body text-muted">No tables yet.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="type-app-title">{current.label}</h2>
                  <p className="type-web-small text-muted">
                    {search
                      ? `${data.total} of ${current.count} ${rowsWord(current.count)} match`
                      : `${data.total} ${rowsWord(data.total)}`}
                    {' · '}
                    <code>stepq.{current.name}</code>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <form action="/admin" className="flex items-center gap-2">
                    <input type="hidden" name="t" value={current.name} />
                    <label htmlFor="admin-search" className="sr-only">
                      Search {current.label}
                    </label>
                    <input
                      id="admin-search"
                      name="q"
                      type="search"
                      defaultValue={search}
                      placeholder="Search"
                      className="type-web-small w-[200px] rounded-[10px] bg-white px-3 py-2 edge"
                    />
                  </form>
                  <a
                    href={`/admin/export?t=${encodeURIComponent(current.name)}`}
                    className="type-web-small-strong rounded-[10px] bg-white px-3 py-2 text-deep edge"
                  >
                    Download CSV
                  </a>
                </div>
              </div>

              {managingAdmins && (saved || deleted) && !editing && (
                <p role="status" className="type-web-small mb-3 text-deep">
                  {deleted ? 'Admin deleted.' : 'Changes saved.'}
                </p>
              )}
              {managingAdmins &&
                (editing ? (
                  <EditAdminForm
                    key={editing.userId}
                    admin={editing}
                    isSelf={editing.userId === state.user.id}
                  />
                ) : (
                  <AddAdminForm />
                ))}

              <div className="overflow-x-auto rounded-card bg-white shadow-card">
                <table className="type-web-small w-full border-collapse text-left">
                  <thead>
                    <tr>
                      {data.columns.map((col) => (
                        <th
                          key={col.name}
                          scope="col"
                          className="whitespace-nowrap px-3 py-2 font-bold text-muted edge-b"
                        >
                          {col.name}
                        </th>
                      ))}
                      {managingAdmins && (
                        <th scope="col" className="px-3 py-2 edge-b">
                          <span className="sr-only">Actions</span>
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.length === 0 && (
                      <tr>
                        <td colSpan={data.columns.length + 1} className="px-3 py-6 text-muted">
                          {search ? 'No rows match.' : 'No rows yet.'}
                        </td>
                      </tr>
                    )}
                    {data.rows.map((row, r) => (
                      <tr key={data.ids[r] ?? r} className="align-top even:bg-page/60">
                        {row.map((cell, i) => (
                          <td key={i} className="max-w-[360px] px-3 py-2">
                            {current.name === 'team_applications' &&
                            i === resumeCol &&
                            data.ids[r] ? (
                              <a
                                href={`/admin/resume/${encodeURIComponent(data.ids[r])}`}
                                className="whitespace-nowrap text-deep underline"
                              >
                                {cell ?? 'Résumé'}
                              </a>
                            ) : (
                              <CellView value={cell} />
                            )}
                          </td>
                        ))}
                        {managingAdmins && (
                          <td className="px-3 py-1 text-right">
                            {data.ids[r] && (
                              <Link
                                href={href({ t: 'admins', edit: data.ids[r]! })}
                                className="type-web-small-strong whitespace-nowrap text-deep"
                              >
                                {data.ids[r] === state.user.id ? 'Edit (you)' : 'Edit'}
                              </Link>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pages > 1 && (
                <nav aria-label="Pages" className="type-web-small mt-4 flex items-center gap-4">
                  {page > 1 ? (
                    <Link
                      href={href({ t: current.name, q: search, p: String(page - 1) })}
                      className="text-deep underline"
                    >
                      Newer
                    </Link>
                  ) : (
                    <span className="text-muted">Newer</span>
                  )}
                  <span>
                    Page {page} of {pages}
                  </span>
                  {page < pages ? (
                    <Link
                      href={href({ t: current.name, q: search, p: String(page + 1) })}
                      className="text-deep underline"
                    >
                      Older
                    </Link>
                  ) : (
                    <span className="text-muted">Older</span>
                  )}
                </nav>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

const rowsWord = (n: number) => (n === 1 ? 'row' : 'rows');

const SHORT = 120;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const IST = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  dateStyle: 'medium',
  timeStyle: 'short',
});

function CellView({ value }: { value: Cell }) {
  if (value === null) return <span className="text-muted">—</span>;
  if (ISO_TIME.test(value)) {
    return (
      <time dateTime={value} title={value} className="whitespace-nowrap">
        {IST.format(new Date(value))}
      </time>
    );
  }
  if (value.length <= SHORT && !value.includes('\n')) {
    return <span className="whitespace-nowrap">{value}</span>;
  }
  return (
    <details className="min-w-[280px]">
      <summary className="cursor-pointer">{value.slice(0, SHORT).split('\n')[0]}…</summary>
      <div className="mt-1 whitespace-pre-wrap break-words">{value}</div>
    </details>
  );
}
