'use client';

import { useId, type Ref, type SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';
import { FieldError, FieldLabel, roundedControl } from './fieldParts';

/** Rounded native select (W04 "Position applied for") with the Figma chevron. */
export function Select<T extends string>({
  label,
  error,
  id,
  options,
  placeholder,
  className = '',
  ref,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  label: string;
  error?: string;
  options: { value: T; label: string }[];
  placeholder?: string;
  ref?: Ref<HTMLSelectElement>;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className={`flex flex-col gap-[6px] ${className}`}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div className="relative">
        <select
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : false}
          aria-describedby={error ? errorId : undefined}
          className={`${roundedControl(error)} block min-h-[53px] appearance-none py-[12px] pr-[44px] pl-[14px]`}
          {...props}
        >
          {placeholder !== undefined && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="chev-ink"
          className="pointer-events-none absolute top-1/2 right-[15.5px] -translate-y-1/2"
        />
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
