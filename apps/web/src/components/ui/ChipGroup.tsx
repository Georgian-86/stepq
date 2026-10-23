'use client';

import { useId, useRef, type KeyboardEvent } from 'react';
import { FieldError } from './fieldParts';

/**
 * Single-choice chips (Figma `4:142`) with radio-group semantics: roving tabindex,
 * arrow keys move selection and focus, Home/End jump. Selected = ink fill, white text.
 */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  onBlur,
  error,
  id,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T | undefined | null;
  onChange: (value: T) => void;
  onBlur?: () => void;
  error?: string;
  id?: string;
}) {
  const autoId = useId();
  const groupId = id ?? autoId;
  const labelId = `${groupId}-label`;
  const errorId = `${groupId}-error`;
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const tabStop = selectedIndex === -1 ? 0 : selectedIndex;

  function move(e: KeyboardEvent<HTMLButtonElement>, from: number) {
    const last = options.length - 1;
    const to =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? from === last
          ? 0
          : from + 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? from === 0
            ? last
            : from - 1
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (to === null) return;
    e.preventDefault();
    onChange(options[to]!.value);
    refs.current[to]?.focus();
  }

  return (
    <div className="flex flex-col gap-[6px]">
      <span id={labelId} className="type-label text-muted">
        {label}
      </span>
      <div
        id={groupId}
        role="radiogroup"
        aria-labelledby={labelId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="mt-[14px] flex flex-wrap gap-s"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onBlur?.();
        }}
      >
        {options.map((o, i) => {
          const selected = i === selectedIndex;
          return (
            <button
              key={o.value}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={i === tabStop ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={(e) => move(e, i)}
              className={`type-chip relative inline-flex after:absolute after:inset-x-0 after:-inset-y-[2px] after:content-['']  min-h-[40px] items-center justify-center rounded-pill px-m py-[11px] whitespace-nowrap transition-colors duration-150 ${
                selected ? 'bg-ink text-white' : 'bg-mint text-ink'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
