'use client';

import { usePublicDoc } from '@/lib/usePublicDoc';

/**
 * "Our early backers" (W01 `9:223`): verified backers who opted in, from `public/backers`.
 * The whole card is hidden until there is at least one name (spec §10a), no placeholders.
 */
export function BackersWall() {
  const wall = usePublicDoc<{ names?: string[] }>('backers');
  const names = wall?.names ?? [];
  if (names.length === 0) return null;

  return (
    <section
      aria-labelledby="backers-title"
      className="flex w-full flex-col gap-m rounded-l bg-white p-[28px]"
    >
      <div className="flex flex-col gap-xs sm:flex-row sm:items-center sm:justify-between">
        <h3 id="backers-title" className="type-web-h3 text-ink">
          Our early backers
        </h3>
        <p className="type-web-small text-muted">Names appear after StepQ verifies the payment.</p>
      </div>
      <ul className="flex flex-wrap gap-[10px]">
        {names.map((name, i) => (
          <li
            key={`${i}-${name}`}
            className="type-chip rounded-pill bg-mint px-m py-[11px] whitespace-nowrap text-ink"
          >
            {name}
          </li>
        ))}
      </ul>
    </section>
  );
}
