/** Shown at once while a dashboard page loads, so a click never looks ignored. */
export default function Loading() {
  const bar = 'animate-pulse rounded-[10px] bg-line/60 motion-reduce:animate-none';
  return (
    <div role="status" aria-label="Loading" className="flex min-h-dvh flex-col">
      <div className="h-[61px] bg-white edge-b" />
      <div className="flex flex-1 flex-col md:flex-row">
        <div className="hidden bg-white p-3 md:block md:w-[248px] md:shadow-[inset_-1.5px_0_0_var(--color-line)]">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className={`${bar} mb-2 h-9`} />
          ))}
        </div>
        <div className="flex-1 px-4 py-5 md:px-8 md:py-7">
          <div className={`${bar} mb-2 h-8 w-48`} />
          <div className={`${bar} mb-6 h-4 w-72`} />
          <div className="rounded-card bg-white p-4 shadow-card">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className={`${bar} mb-3 h-6`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
