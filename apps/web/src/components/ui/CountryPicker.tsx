'use client';

import { COUNTRY_ALIASES, COUNTRY_FIRST, COUNTRY_LIST, type Country } from '@stepq/schemas';
import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Icon } from './Icon';
import { FieldError, FieldLabel, roundedControl } from './fieldParts';

type Option = { code: string; name: Country };

/** India first, then A–Z. */
const OPTIONS: Option[] = [
  ...COUNTRY_LIST.filter((c) => c.name === COUNTRY_FIRST),
  ...COUNTRY_LIST.filter((c) => c.name !== COUNTRY_FIRST),
];

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Options whose name (or a word in it), code or alias starts with the query. */
export function filterCountries(query: string): Option[] {
  const q = fold(query);
  if (!q) return OPTIONS;
  return OPTIONS.filter(({ code, name }) => {
    const names = [name, ...(COUNTRY_ALIASES[name] ?? [])].map(fold);
    return (
      code.toLowerCase() === q ||
      names.some((n) => n.startsWith(q) || n.split(/[\s&().-]+/).some((w) => w.startsWith(q)))
    );
  });
}

function Flag({ code }: { code: string }) {
  return (
    <img
      src={`/flags/${code.toLowerCase()}.svg`}
      alt=""
      width={24}
      height={16}
      loading="lazy"
      className="h-4 w-6 shrink-0 rounded-[3px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
    />
  );
}

/**
 * Searchable country field with flags: an ARIA 1.2 combobox (type to filter, arrows to move,
 * Enter to pick, Escape to close) over a listbox. Leaving the field without picking keeps the
 * previous country.
 */
export function CountryPicker({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder = 'Search your country',
}: {
  id?: string;
  label: string;
  value: string | undefined;
  onChange: (value: Country) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const listId = `${inputId}-list`;
  const errorId = `${inputId}-error`;
  const selected = COUNTRY_LIST.find((c) => c.name === value);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const options = useMemo(() => filterCountries(query ?? ''), [query]);

  function show(index: number) {
    setActive(index);
    setOpen(true);
    requestAnimationFrame(() =>
      listRef.current
        ?.querySelector(`[data-index="${index}"]`)
        ?.scrollIntoView?.({ block: 'nearest' }),
    );
  }

  function openList() {
    const i = selected ? OPTIONS.findIndex((o) => o.code === selected.code) : 0;
    show(Math.max(i, 0));
  }

  function close() {
    setOpen(false);
    setQuery(null);
  }

  function pick(option: Option) {
    onChange(option.name);
    close();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const last = options.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) openList();
      else show(Math.min(active + 1, last));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (open) show(Math.max(active - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && options[active]) {
        e.preventDefault();
        pick(options[active]);
      }
    } else if (e.key === 'Escape') {
      if (open) {
        e.preventDefault();
        e.stopPropagation(); // keep a surrounding modal open
        close();
      }
    }
  }

  const activeOption = open ? options[active] : undefined;

  return (
    <div className="flex flex-col gap-[6px]">
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-[15.5px] flex -translate-y-1/2">
          {selected && query === null ? (
            <Flag code={selected.code} />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="text-muted"
            >
              <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
              <path
                d="m20 20-3.5-3.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOption ? `${listId}-${activeOption.code}` : undefined}
          aria-invalid={error ? true : false}
          aria-describedby={error ? errorId : undefined}
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query ?? selected?.name ?? ''}
          onChange={(e) => {
            setQuery(e.target.value);
            show(0);
          }}
          onFocus={(e) => e.target.select()}
          onClick={() => (open ? undefined : openList())}
          onKeyDown={onKeyDown}
          onBlur={() => {
            close();
            onBlur?.();
          }}
          className={`${roundedControl(error)} block min-h-[53px] py-[13.5px] pr-[45.5px] pl-[51px]`}
        />
        <Icon
          name="chev-ink"
          className={`pointer-events-none absolute top-1/2 right-[15.5px] -translate-y-1/2 transition-transform ${open ? 'rotate-180' : ''}`}
        />
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={label}
          hidden={!open}
          // Keep focus in the input while a pointer picks an option.
          onMouseDown={(e) => e.preventDefault()}
          className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-[264px] overflow-y-auto overscroll-contain rounded-(--radius-s) bg-white py-[6px] shadow-card edge"
        >
          {/* Options exist only while open: 250 lazy flag images would otherwise sit unloaded. */}
          {open && options.length === 0 && (
            <li role="presentation" className="type-web-body px-[15.5px] py-[10px] text-muted">
              No country matches “{query}”
            </li>
          )}
          {open &&
            options.map((o, i) => (
              <li
                key={o.code}
                id={`${listId}-${o.code}`}
                role="option"
                aria-selected={o.name === value}
                data-index={i}
                onClick={() => pick(o)}
                onMouseMove={() => i !== active && setActive(i)}
                className={`type-web-body flex min-h-[44px] cursor-pointer items-center gap-[12px] px-[15.5px] text-ink ${
                  i === active ? 'bg-mint' : ''
                } ${o.name === value ? 'font-bold' : ''}`}
              >
                <Flag code={o.code} />
                <span className="truncate">{o.name}</span>
              </li>
            ))}
        </ul>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
