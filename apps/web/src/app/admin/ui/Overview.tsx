import { Suspense, type ReactNode } from 'react';
import { TABLES } from '@/lib/adminTables';
import type { Overview as OverviewData, SiteStats, TableInfo } from '@/server/admin/data';
import { DailyBars, RankedList, StatusBars } from './Charts';
import { NavLink } from './nav';

export const RANGES = [7, 30, 90] as const;

function Card({
  title,
  action,
  children,
  className = '',
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card bg-white p-5 shadow-card ${className}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h3 className="type-web-body-strong">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

/**
 * The Stats page: totals, new rows per day for every table, statuses, and website traffic. The
 * website numbers (`site`, the slowest to count) stream in on their own.
 */
export function Overview({
  data,
  site,
  tables,
  range,
}: {
  data: OverviewData;
  site: Promise<SiteStats | null>;
  tables: TableInfo[];
  range: number;
}) {
  const main = tables.filter((t) => !t.internal);
  const charted = main.filter((t) => data.daily[t.name] && t.name !== 'admins');
  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="type-app-title">Stats</h2>
          <p className="type-web-small text-muted">
            Everything on the site, last {range} days (India time).
          </p>
        </div>
        <nav aria-label="Date range" className="flex rounded-full bg-white p-1 edge">
          {RANGES.map((r) => (
            <NavLink
              key={r}
              href={r === 30 ? '/admin' : `/admin?range=${r}`}
              scroll={false}
              aria-current={r === range ? 'page' : undefined}
              className={`type-web-small-strong rounded-full px-3.5 py-1.5 ${r === range ? 'bg-deep text-white' : 'text-muted hover:text-ink'}`}
            >
              {r} days
            </NavLink>
          ))}
        </nav>
      </div>

      <ul className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        <Suspense fallback={<TileSkeleton />}>
          <SiteTile site={site} />
        </Suspense>
        {main.map((t) => {
          const daily = data.daily[t.name];
          return (
            <Tile
              key={t.name}
              label={t.label}
              value={t.count}
              note={daily ? `+${sum(daily)} in ${range} days` : 'total'}
              href={`/admin?t=${t.name}`}
            />
          );
        })}
      </ul>

      <Suspense fallback={<SiteSkeleton />}>
        <SiteSection site={site} days={data.days} />
      </Suspense>

      <h3 className="type-app-subheading mb-3">Records</h3>
      <div className="grid gap-4 xl:grid-cols-2">
        {charted.map((t) => {
          const def = TABLES[t.name];
          const statuses = def?.status && data.statuses[t.name];
          return (
            <Card
              key={t.name}
              title={`${t.label}: new per day`}
              action={
                <NavLink
                  href={`/admin?t=${t.name}`}
                  className="type-web-small-strong text-deep hover:underline"
                >
                  Open
                </NavLink>
              }
            >
              <DailyBars
                title={`${t.label}: new per day`}
                days={data.days}
                values={data.daily[t.name]!}
              />
              {def?.status && statuses && (
                <div className="mt-4 border-t border-line pt-4">
                  <h4 className="type-web-small-strong mb-2 text-muted">
                    {def.status.label} (all time)
                  </h4>
                  <StatusBars def={def.status} values={statuses} />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function Tile({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: number;
  note: string;
  href: string;
}) {
  return (
    <li>
      <NavLink
        href={href}
        className="flex h-full flex-col gap-1 rounded-card bg-white p-4 shadow-card transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0"
      >
        <span className="type-web-small text-muted">{label}</span>
        <span className="type-app-number-m tabular-nums">{value.toLocaleString('en-IN')}</span>
        <span className="type-web-small text-deep">{note}</span>
      </NavLink>
    </li>
  );
}

async function SiteTile({ site }: { site: Promise<SiteStats | null> }) {
  const s = await site;
  if (!s) return null;
  return (
    <Tile
      label="Website visits"
      value={sum(s.views)}
      note={`${sum(s.clicks)} clicks`}
      href="/admin?t=site_events"
    />
  );
}

async function SiteSection({ site, days }: { site: Promise<SiteStats | null>; days: string[] }) {
  const s = await site;
  if (!s) return null;
  return (
    <>
      <h3 className="type-app-subheading mb-3 mt-2">Website</h3>
      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <Card title="Page visits per day">
          <DailyBars title="Page visits per day" days={days} values={s.views} unit="visits" />
        </Card>
        <Card title="Clicks per day">
          <DailyBars title="Clicks per day" days={days} values={s.clicks} unit="clicks" />
        </Card>
        <div className="grid gap-4 md:grid-cols-3 xl:col-span-2">
          <Card title="Top pages">
            <RankedList items={s.pages} empty="No visits yet." />
          </Card>
          <Card title="Most clicked">
            <RankedList items={s.clicked} empty="No clicks yet." />
          </Card>
          <Card title="Coming from">
            <RankedList items={s.referrers} empty="No other sites yet." />
          </Card>
        </div>
      </div>
    </>
  );
}

const pulse = 'animate-pulse rounded-[10px] bg-line/60 motion-reduce:animate-none';

function TileSkeleton() {
  return (
    <li aria-hidden="true" className="flex flex-col gap-2 rounded-card bg-white p-4 shadow-card">
      <div className={`${pulse} h-4 w-24`} />
      <div className={`${pulse} h-8 w-16`} />
      <div className={`${pulse} h-4 w-20`} />
    </li>
  );
}

function SiteSkeleton() {
  return (
    <div role="status" aria-label="Loading website stats" className="mb-6">
      <h3 className="type-app-subheading mb-3 mt-2">Website</h3>
      <div className="grid gap-4 xl:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-[248px] rounded-card bg-white p-5 shadow-card">
            <div className={`${pulse} mb-4 h-5 w-40`} />
            <div className={`${pulse} h-[170px]`} />
          </div>
        ))}
      </div>
    </div>
  );
}
