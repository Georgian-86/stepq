'use client';

import { useId, type InputHTMLAttributes, type Ref } from 'react';
import { FieldError } from './fieldParts';

/**
 * Underlined text field (Figma `4:135`). Caps label above; 1.5 px line underline that grows
 * into a 2 px deep-green bar on focus (scaleX, transform only); error = tomato bar + helper.
 * As in Figma, the field is 63.5 px tall, 64 px while focused or in error (2 px underline).
 * The underline is an inset shadow over the bottom padding: a 1.5 px border renders 1 px.
 */
export function Field({
  label,
  error,
  id,
  className = '',
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  ref?: Ref<HTMLInputElement>;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className={`flex flex-col gap-[6px] ${className}`}>
      <label htmlFor={inputId} className="type-label text-muted">
        {label}
      </label>
      <div
        className={`group relative edge-b ${error ? 'pb-[2px]' : 'pb-[1.5px] focus-within:pb-[2px]'}`}
      >
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : false}
          aria-describedby={error ? errorId : undefined}
          className="type-app-body block w-full bg-transparent py-[10px] text-ink outline-none placeholder:text-muted"
          {...props}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left transition-transform duration-200 ease-out ${
            error ? 'scale-x-100 bg-tomato' : 'scale-x-0 bg-deep group-focus-within:scale-x-100'
          }`}
        />
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
