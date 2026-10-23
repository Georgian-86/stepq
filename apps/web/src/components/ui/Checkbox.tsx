'use client';

import { useId, type ReactNode } from 'react';
import { Icon } from './Icon';
import { FieldError } from './fieldParts';

/** 22 px deep-green checkbox with the Figma check (W09 T&C). `children` follow the label (e.g. a link). */
export function Checkbox({
  label,
  checked,
  onChange,
  error,
  children,
  id,
  name,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children?: ReactNode;
  id?: string;
  name?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className="flex flex-col gap-[6px]">
      <div className="flex flex-wrap items-center gap-x-[10px]">
        <label
          htmlFor={inputId}
          className="flex min-h-[44px] cursor-pointer items-center gap-[10px]"
        >
          <span className="relative inline-flex size-[22px] shrink-0">
            <input
              id={inputId}
              name={name}
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(e.target.checked)}
              aria-invalid={error ? true : false}
              aria-describedby={error ? errorId : undefined}
              className="peer absolute inset-0 m-0 cursor-pointer opacity-0"
            />
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-flex size-[22px] items-center justify-center rounded-check border-[1.5px] transition-colors duration-150 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-deep ${
                checked
                  ? 'border-deep bg-deep'
                  : error
                    ? 'border-tomato bg-white'
                    : 'border-line bg-white'
              }`}
            >
              {checked && <Icon name="check-white" />}
            </span>
          </span>
          <span className="type-web-small text-ink">{label}</span>
        </label>
        {children}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
