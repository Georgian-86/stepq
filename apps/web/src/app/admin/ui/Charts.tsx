import type { FacetValue, Ranked } from '@/server/admin/data';
import { TONE_DOT, prettyValue, statusOption, type StatusDef } from '@/lib/adminTables';

const DAY_LABEL = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
});
const dayLabel = (d: string) => DAY_LABEL.format(new Date(`${d}T00:00:00Z`));

/** A round axis maximum: 1, 2, 5 × 10ⁿ at or above `n`. */
function niceMax(n: number): number {
  if (n <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(n));
  return ([1, 2, 2.5, 5, 10].find((m) => m * p >= n) ?? 10) * p;
}

const W = 640;
const H = 180;
const PAD = { top: 12, right: 8, bottom: 26, left: 34 };

/**
 * Daily counts as bars (one series, one hue), with a hover title per day over the full column
 * height, a recessive grid, and the same numbers as a table for screen readers and copying.
 */
export function DailyBars({
  title,
  days,
  values,
  unit = 'rows',
}: {
  title: string;
  days: string[];
  values: number[];
  unit?: string;
}) {
  const max = niceMax(Math.max(0, ...values));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const step = plotW / Math.max(1, values.length);
  const gap = values.length > 60 ? 1 : 2;
  const barW = Math.max(1, step - gap);
  const y = (v: number) => PAD.top + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(values.length / 6);
  const last = days.length - 1;
  // Every n-th day, and the last day unless it would crowd the previous label.
  const showLabel = (i: number) =>
    i % labelEvery === 0 || (i === last && last % labelEvery >= labelEvery / 2);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <figure className="m-0">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${title}: ${total} ${unit} over ${days.length} days`}
        className="block h-auto w-full"
      >
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-line)"
              strokeWidth={1}
              strokeDasharray={t === 0 ? undefined : '3 4'}
            />
            <text
              x={PAD.left - 8}
              y={y(t)}
              dy="0.32em"
              textAnchor="end"
              fontSize={11}
              fill="var(--color-muted)"
              className="tabular-nums"
            >
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {values.map((v, i) => {
          const x = PAD.left + i * step + gap / 2;
          const h = Math.max(0, y(0) - y(v));
          const r = Math.min(4, barW / 2, h);
          return (
            <g key={days[i]} className="group/bar">
              <title>{`${dayLabel(days[i]!)}: ${v} ${v === 1 ? unit.replace(/s$/, '') : unit}`}</title>
              <rect
                x={x - gap / 2}
                y={PAD.top}
                width={step}
                height={plotH}
                fill="transparent"
                className="group-hover/bar:fill-[rgb(10_127_63/0.06)]"
              />
              {v > 0 && (
                <path
                  d={`M${x},${y(0)} V${y(v) + r} Q${x},${y(v)} ${x + r},${y(v)} H${x + barW - r} Q${x + barW},${y(v)} ${x + barW},${y(v) + r} V${y(0)} Z`}
                  fill="var(--color-deep)"
                  className="group-hover/bar:fill-[var(--color-leaf)]"
                />
              )}
            </g>
          );
        })}
        {days.map((d, i) =>
          showLabel(i) ? (
            <text
              key={d}
              x={PAD.left + i * step + step / 2}
              y={H - 8}
              textAnchor="middle"
              fontSize={11}
              fill="var(--color-muted)"
            >
              {dayLabel(d)}
            </text>
          ) : null,
        )}
      </svg>
      <details className="type-web-small mt-1 text-muted">
        <summary className="cursor-pointer select-none hover:text-ink">Show as table</summary>
        <div className="mt-2 max-h-[220px] overflow-auto rounded-[10px] edge">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr>
                <th scope="col" className="px-3 py-1.5 font-bold edge-b">
                  Day
                </th>
                <th scope="col" className="px-3 py-1.5 text-right font-bold edge-b">
                  {unit[0]!.toUpperCase() + unit.slice(1)}
                </th>
              </tr>
            </thead>
            <tbody>
              {days.map((d, i) => (
                <tr key={d}>
                  <td className="px-3 py-1">{dayLabel(d)}</td>
                  <td className="px-3 py-1 text-right tabular-nums text-ink">{values[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Rows per status as labelled horizontal bars; each status keeps its own colour and label. */
export function StatusBars({ def, values }: { def: StatusDef; values: FacetValue[] }) {
  const total = values.reduce((a, b) => a + b.count, 0);
  const byValue = new Map(values.map((v) => [v.value ?? '', v.count]));
  const rows = [
    ...def.options.map((o) => ({
      key: o.value,
      label: o.label,
      tone: o.tone,
      count: byValue.get(o.value) ?? 0,
    })),
    ...values
      .filter((v) => !statusOption(def, v.value))
      .map((v) => ({
        key: v.value ?? '',
        label: v.value ? prettyValue(v.value) : 'Not set',
        tone: 'neutral' as const,
        count: v.count,
      })),
  ];
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(110px,40%)_1fr_auto] items-center gap-3">
          <span className="type-web-small flex items-center gap-2 truncate">
            <span
              aria-hidden="true"
              className={`size-2 shrink-0 rounded-full ${TONE_DOT[r.tone]}`}
            />
            {r.label}
          </span>
          <span className="h-2 overflow-hidden rounded-full bg-page" aria-hidden="true">
            <span
              className={`block h-full rounded-full ${TONE_DOT[r.tone]}`}
              style={{ width: `${(r.count / max) * 100}%` }}
            />
          </span>
          <span className="type-web-small-strong w-[64px] text-right tabular-nums">
            {r.count}
            <span className="font-normal text-muted">
              {' '}
              {total ? `${Math.round((r.count / total) * 100)}%` : ''}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A ranked list with proportional bars (top pages, clicks, referrers). */
export function RankedList({ items, empty }: { items: Ranked[]; empty: string }) {
  if (!items.length) return <p className="type-web-small text-muted">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ol className="flex flex-col gap-1.5">
      {items.map((i) => (
        <li
          key={i.label}
          className="relative flex items-center justify-between gap-3 overflow-hidden rounded-[8px] px-2.5 py-1.5"
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 rounded-[8px] bg-mint"
            style={{ width: `${(i.count / max) * 100}%` }}
          />
          <span className="type-web-small relative truncate" title={i.label}>
            {i.label}
          </span>
          <span className="type-web-small-strong relative tabular-nums">{i.count}</span>
        </li>
      ))}
    </ol>
  );
}
