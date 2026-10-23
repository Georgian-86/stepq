'use client';

import { useEffect, useRef } from 'react';

/**
 * Focusable list of form errors shown after a failed submit. Each item links to its field
 * (`#<fieldId>`). Pass a changing `focusKey` (e.g. useZodForm's failedSubmits) to re-focus.
 */
export function ErrorSummary({
  errors,
  labels = {},
  fieldId = (name) => name,
  focusKey,
  title = 'Please fix these and try again:',
}: {
  errors: Record<string, string>;
  labels?: Record<string, string>;
  fieldId?: (name: string) => string;
  focusKey?: number;
  title?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const entries = Object.entries(errors);
  const visible = entries.length > 0;

  useEffect(() => {
    if (visible) ref.current?.focus();
  }, [visible, focusKey]);

  if (!visible) return null;
  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      className="rounded-(--radius-s) bg-tomato-soft p-m text-tomato-text outline-none focus-visible:outline-2 focus-visible:outline-tomato"
    >
      <p className="type-web-small-strong">{title}</p>
      <ul className="type-web-small mt-xs list-disc pl-[18px]">
        {entries.map(([name, message]) => (
          <li key={name}>
            <a
              href={`#${fieldId(name)}`}
              className="underline underline-offset-2"
              onClick={(e) => {
                const el = document.getElementById(fieldId(name));
                if (!el) return;
                e.preventDefault();
                // Groups (chips) are not focusable themselves: focus their tab stop.
                const target = el.matches('input,select,textarea,button,a[href],[tabindex]')
                  ? el
                  : (el.querySelector<HTMLElement>('[tabindex="0"],input,select,textarea,button') ??
                    el);
                target.focus();
                el.scrollIntoView({ block: 'center' });
              }}
            >
              {labels[name] ? `${labels[name]}: ${message}` : message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
