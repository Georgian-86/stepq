'use client';

import type { TableInfo } from '@/server/admin/data';
import { AdminIcon } from './AdminIcon';
import { NavLink, useActiveTable } from './nav';

/**
 * The dashboard's table list, with row counts. It lives in the layout, so it stays put (and is
 * not re-counted) while you move between views, and marks the view you clicked straight away.
 */
export function SidebarNav({ tables }: { tables: TableInfo[] }) {
  const current = useActiveTable();
  const main = tables.filter((x) => !x.internal);
  const system = tables.filter((x) => x.internal);
  const item = (on: boolean) =>
    `type-web-small flex min-h-[40px] items-center justify-between gap-3 whitespace-nowrap rounded-[10px] px-3 transition-colors ${
      on ? 'bg-deep text-white' : 'text-ink hover:bg-page'
    }`;
  const badge = (on: boolean) =>
    `rounded-full px-2 py-0.5 text-[12px] font-bold tabular-nums ${on ? 'bg-white/20 text-white' : 'bg-page text-muted'}`;
  const link = (x: TableInfo, extra = '') => (
    <li key={x.name}>
      <NavLink
        href={`/admin?t=${encodeURIComponent(x.name)}`}
        aria-current={x.name === current ? 'page' : undefined}
        className={`${item(x.name === current)} ${extra}`}
      >
        <span>{x.label}</span>
        <span className={badge(x.name === current)}>{x.count.toLocaleString('en-IN')}</span>
      </NavLink>
    </li>
  );
  return (
    <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      <li>
        <NavLink
          href="/admin"
          aria-current={current === '' ? 'page' : undefined}
          className={item(current === '')}
        >
          <span className="flex items-center gap-2">
            <AdminIcon name="chart" className="size-4" />
            Stats
          </span>
        </NavLink>
      </li>
      <li aria-hidden="true" className="type-label hidden px-3 pt-4 pb-1 text-muted md:block">
        Records
      </li>
      {main.map((x) => link(x))}
      {system.length > 0 && (
        <li aria-hidden="true" className="type-label hidden px-3 pt-4 pb-1 text-muted md:block">
          System
        </li>
      )}
      {system.map((x) => link(x, x.name === current ? '' : 'text-muted'))}
    </ul>
  );
}
