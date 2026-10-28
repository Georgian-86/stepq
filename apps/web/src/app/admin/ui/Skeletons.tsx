/**
 * Placeholders shaped like the views they stand in for, so the layout does not jump when the
 * data arrives. Shown by the server while a view streams in and by `NavContent` the moment a
 * link is clicked.
 */

const bar = 'animate-pulse rounded-[10px] bg-line/60 motion-reduce:animate-none';

export function TableSkeleton({ title }: { title?: string }) {
  return (
    <div role="status" aria-label={title ? `Loading ${title}` : 'Loading'}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          {title ? (
            <h2 className="type-app-title">{title}</h2>
          ) : (
            <div className={`${bar} mb-2 h-8 w-48`} />
          )}
          <div className={`${bar} mt-1.5 h-4 w-72 max-w-full`} />
        </div>
        <div className={`${bar} h-10 w-32 rounded-[10px]`} />
      </div>
      <div className="mb-3 flex gap-1.5">
        {[64, 120, 96, 104].map((w, i) => (
          <div key={i} className={`${bar} h-9 rounded-full`} style={{ width: w }} />
        ))}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <div className={`${bar} h-10 w-full sm:w-[300px]`} />
        <div className={`${bar} h-10 w-36`} />
        <div className={`${bar} hidden h-10 w-[310px] sm:block`} />
      </div>
      <div className="overflow-hidden rounded-card bg-white shadow-card">
        <div className="flex gap-6 px-3 py-3 edge-b">
          {[30, 22, 18, 16].map((w, i) => (
            <div key={i} className={`${bar} h-4`} style={{ width: `${w}%` }} />
          ))}
        </div>
        {Array.from({ length: 10 }, (_, r) => (
          <div key={r} className="flex items-center gap-6 px-3 py-3 [&:not(:last-child)]:edge-b">
            {[30, 22, 18, 16].map((w, i) => (
              <div
                key={i}
                className={`${bar} h-4`}
                style={{ width: `${w - ((r * 7 + i * 3) % 8)}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div role="status" aria-label="Loading stats">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="type-app-title">Stats</h2>
          <div className={`${bar} mt-1.5 h-4 w-64`} />
        </div>
        <div className={`${bar} h-10 w-56 rounded-full`} />
      </div>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-card bg-white p-4 shadow-card">
            <div className={`${bar} h-4 w-24`} />
            <div className={`${bar} h-8 w-16`} />
            <div className={`${bar} h-4 w-28`} />
          </div>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="rounded-card bg-white p-5 shadow-card">
            <div className={`${bar} mb-4 h-5 w-40`} />
            <div className="flex h-[150px] items-end gap-1">
              {Array.from({ length: 30 }, (_, d) => (
                <div
                  key={d}
                  className={`${bar} flex-1 rounded-[3px]`}
                  style={{ height: `${20 + ((d * 37 + i * 11) % 70)}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The details panel, open, with its fields still loading. */
export function PanelSkeleton() {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 animate-fade-in bg-ink/30" />
      <aside
        role="status"
        aria-label="Loading details"
        className="relative flex h-full w-full max-w-[520px] animate-modal-in flex-col bg-white shadow-card"
      >
        <div className="px-5 pt-5 pb-4 edge-b">
          <div className={`${bar} mb-2 h-4 w-28`} />
          <div className={`${bar} h-7 w-56`} />
        </div>
        <div className="flex flex-col px-5 py-4">
          {Array.from({ length: 9 }, (_, i) => (
            <div key={i} className="grid gap-2 py-3 edge-b sm:grid-cols-[150px_1fr] sm:gap-3">
              <div className={`${bar} h-4 w-24`} />
              <div className={`${bar} h-4`} style={{ width: `${55 + ((i * 23) % 40)}%` }} />
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div aria-hidden="true" className="flex gap-1 md:flex-col">
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className={`${bar} h-10 w-28 shrink-0 md:w-full`} />
      ))}
    </div>
  );
}
