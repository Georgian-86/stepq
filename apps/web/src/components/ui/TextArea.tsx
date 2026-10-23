'use client';

import { useId, type Ref, type TextareaHTMLAttributes } from 'react';
import { FieldError, FieldLabel, roundedControl } from './fieldParts';

/** Rounded multi-line field (W04 "Why StepQ?"): 96 px tall, 14 px padding. */
export function TextArea({
  label,
  error,
  id,
  className = '',
  ref,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  ref?: Ref<HTMLTextAreaElement>;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  return (
    <div className={`flex flex-col gap-[6px] ${className}`}>
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <textarea
        ref={ref}
        id={inputId}
        rows={3}
        aria-invalid={error ? true : false}
        aria-describedby={error ? errorId : undefined}
        className={`${roundedControl(error)} block min-h-[96px] resize-y p-[14px]`}
        {...props}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
