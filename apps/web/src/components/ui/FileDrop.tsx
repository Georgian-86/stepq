'use client';

import { useId, useRef, type ChangeEvent } from 'react';
import { Icon } from './Icon';
import { FieldError, FieldLabel } from './fieldParts';

const formatMb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`;

/**
 * Résumé picker (W04 "Resume upload"): mint row with upload icon, file name, the
 * "PDF, up to 5 MB" hint and × to clear. Name/type and size are checked here; a rejected
 * file only reaches `onReject` ("Upload a PDF up to 5 MB").
 */
export function FileDrop({
  label,
  accept,
  maxBytes,
  value,
  onChange,
  onReject,
  error,
  id,
}: {
  label: string;
  accept: 'application/pdf';
  maxBytes: number;
  value: File | null;
  onChange: (file: File | null) => void;
  onReject?: (message: string) => void;
  error?: string;
  id?: string;
}) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;
  const input = useRef<HTMLInputElement>(null);
  const hint = `PDF, up to ${formatMb(maxBytes)}`;

  function pick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    e.target.value = '';
    if (!file) return;
    const isPdf =
      file.name.toLowerCase().endsWith('.pdf') && (file.type === accept || file.type === '');
    if (!isPdf || file.size > maxBytes) {
      onReject?.(`Upload a PDF up to ${formatMb(maxBytes)}`);
      return;
    }
    onChange(file);
  }

  return (
    <div className="flex flex-col gap-[6px]">
      <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
      <div
        className={`relative flex items-center gap-[12px] rounded-(--radius-s) border-[1.5px] bg-mint p-m transition-colors duration-150 focus-within:border-deep ${
          error ? 'border-tomato' : 'border-line'
        }`}
      >
        <Icon name="upload-deep" />
        <div className="type-web-small flex min-w-0 flex-1 flex-col">
          <span className="type-web-small-strong truncate text-ink">
            {value ? value.name : 'Choose a PDF'}
          </span>
          <span id={hintId} className="text-muted">
            {value ? `${hint} · uploaded` : hint}
          </span>
        </div>
        <input
          ref={input}
          id={inputId}
          type="file"
          accept={accept}
          onChange={pick}
          aria-invalid={error ? true : false}
          aria-describedby={error ? `${errorId} ${hintId}` : hintId}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              input.current?.focus();
            }}
            aria-label={`Remove ${value.name}`}
            className="relative z-10 -m-[13px] inline-flex size-[44px] items-center justify-center"
          >
            <Icon name="x-muted" />
          </button>
        )}
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
