'use client';

import Form from 'next/form';
import Link from 'next/link';
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { TABLES, TONE_CLASS, TONE_DOT, statusOption } from '@/lib/adminTables';
import { setStatusAction } from '../actions';

/** A GET form that navigates (client-side) as soon as a select or date changes. */
export function AutoForm({ children, ...props }: ComponentProps<typeof Form>) {
  return (
    <Form
      {...props}
      onChange={(e) => {
        const el = e.target as HTMLElement;
        if (
          el instanceof HTMLSelectElement ||
          (el instanceof HTMLInputElement && el.type === 'date')
        ) {
          e.currentTarget.requestSubmit();
        }
      }}
    >
      {children}
    </Form>
  );
}

/** A `<details>` dropdown that closes on Escape and on a click outside it. */
export function Popover({
  summary,
  children,
  className = '',
  align = 'right',
}: {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  align?: 'left' | 'right';
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !el.contains(e.target as Node)) {
        el.open = false;
        if (e instanceof KeyboardEvent) el.querySelector('summary')?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', close);
    };
  }, []);
  return (
    <details ref={ref} className={`group relative ${className}`}>
      <summary className="type-web-small-strong flex min-h-[40px] cursor-pointer list-none items-center gap-2 rounded-[10px] bg-white px-3 text-ink edge hover:bg-page [&::-webkit-details-marker]:hidden">
        {summary}
      </summary>
      <div
        className={`absolute top-[calc(100%+6px)] z-30 w-[min(340px,calc(100vw-32px))] rounded-[14px] bg-white p-4 shadow-card edge ${
          align === 'right' ? 'right-0' : 'left-0'
        }`}
      >
        {children}
      </div>
    </details>
  );
}

function useStatus(table: string, id: string, value: string | null) {
  const def = TABLES[table]!.status!;
  const [current, setCurrent] = useState(value ?? '');
  const [error, setError] = useState('');
  const [pending, start] = useTransition();
  useEffect(() => setCurrent(value ?? ''), [value]);
  const change = (next: string) => {
    if (next === current) return;
    if (def.confirm && next === def.confirm.value && !window.confirm(def.confirm.message)) return;
    const before = current;
    setCurrent(next);
    setError('');
    start(async () => {
      const res = await setStatusAction(table, id, next);
      if (res.error) {
        setCurrent(before);
        setError(res.error);
      }
    });
  };
  return { def, current, change, pending, error };
}

/** A status as a coloured pill that is also its own menu (in table rows). */
export function StatusSelect({
  table,
  id,
  value,
  name,
}: {
  table: string;
  id: string;
  value: string | null;
  name: string;
}) {
  const { def, current, change, pending, error } = useStatus(table, id, value);
  const opt = statusOption(def, current || null);
  const tone = opt?.tone ?? 'neutral';
  return (
    <span className="inline-flex flex-col gap-1">
      <span
        className={`type-web-small-strong relative inline-flex items-center gap-1.5 rounded-full py-1 pr-7 pl-2.5 ${TONE_CLASS[tone]} ${
          pending ? 'opacity-60' : ''
        } focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-deep`}
      >
        <span aria-hidden="true" className={`size-2 rounded-full ${TONE_DOT[tone]}`} />
        <span className="whitespace-nowrap">{opt?.label ?? (current ? current : 'Not set')}</span>
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="pointer-events-none absolute right-2 size-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="M7 10l5 5 5-5" />
        </svg>
        <select
          aria-label={`${def.label} for ${name}`}
          value={current}
          disabled={pending}
          onChange={(e) => change(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {(def.clearable || !current) && <option value="">Not set</option>}
          {current && !opt && <option value={current}>{current}</option>}
          {def.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
      {error && (
        <span role="alert" className="type-web-small text-tomato-text">
          {error}
        </span>
      )}
    </span>
  );
}

/** A status as a row of buttons (in the details panel). */
export function StatusButtons({
  table,
  id,
  value,
}: {
  table: string;
  id: string;
  value: string | null;
}) {
  const { def, current, change, pending, error } = useStatus(table, id, value);
  const options = def.clearable
    ? [...def.options, { value: '', label: 'Not set', tone: 'neutral' as const }]
    : def.options;
  return (
    <div>
      <div role="group" aria-label={def.label} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = o.value === current;
          return (
            <button
              key={o.value || 'none'}
              type="button"
              aria-pressed={on}
              disabled={pending}
              onClick={() => change(o.value)}
              className={`type-web-small-strong inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3 transition-colors ${
                on
                  ? `${TONE_CLASS[o.tone]} edge [--edge:currentColor]`
                  : 'bg-white text-muted edge hover:bg-page'
              } disabled:opacity-60`}
            >
              <span aria-hidden="true" className={`size-2 rounded-full ${TONE_DOT[o.tone]}`} />
              {o.label}
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="type-web-small mt-2 text-tomato-text">
          {error}
        </p>
      )}
    </div>
  );
}

/** Closes the details panel on Escape by following its close link. */
export function EscapeLink({ href }: { href: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current?.click();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return (
    <Link
      ref={ref}
      href={href}
      scroll={false}
      aria-label="Close details"
      className="inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-page"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </Link>
  );
}
