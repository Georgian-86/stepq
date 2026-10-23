'use client';

import { useCallback, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import type { z } from 'zod';
import { ApiFieldError, GENERIC_ERROR } from './api';

type AnyObject = z.ZodObject<z.ZodRawShape>;
type Values<S extends AnyObject> = Partial<Record<keyof z.input<S> & string, unknown>>;
type Errors = Record<string, string>;

/** RFC 4122 v4 id; falls back to getRandomValues where randomUUID is missing (older Safari, http). */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6]! & 0x0f) | 0x40;
  b[8] = (b[8]! & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function issuesToErrors(issues: z.ZodIssue[]): Errors {
  const out: Errors = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.');
    if (key && !(key in out)) out[key] = issue.message;
  }
  return out;
}

export interface ZodFormOptions<S extends AnyObject> {
  initial?: Values<S>;
  /**
   * Namespaces element ids (`<prefix>-<key>`) so two forms on one page (e.g. the waitlist card
   * and the founder modal, both with name/email) never share an id. Pass `fieldId` to
   * ErrorSummary so its links resolve.
   */
  idPrefix?: string;
}

/**
 * Form state validated by a shared zod schema. Fields validate on blur and all at once on
 * submit. `requestId` (the server's idempotency key) is created once per form instance, kept
 * across retries of a failed submit, and renewed only after a successful one.
 */
export function useZodForm<S extends AnyObject>(
  schema: S,
  { initial = {}, idPrefix }: ZodFormOptions<S> = {},
) {
  const [values, setValues] = useState<Values<S>>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** Increments on every failed submit so an ErrorSummary can re-focus itself. */
  const [failedSubmits, setFailedSubmits] = useState(0);
  const requestId = useRef<string | null>(null);
  requestId.current ??= uuid();
  const inFlight = useRef(false);
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const payload = useCallback(
    (v: Values<S>) => ({ website: '', ...v, requestId: requestId.current }),
    [],
  );

  const setValue = useCallback(<K extends keyof Values<S> & string>(key: K, value: unknown) => {
    setValues((prev) => {
      const next = { ...prev, [key]: value };
      valuesRef.current = next;
      return next;
    });
  }, []);

  const validateField = useCallback(
    (key: string) => {
      const res = schema.safeParse(payload(valuesRef.current));
      const message = res.success ? undefined : issuesToErrors(res.error.issues)[key];
      setErrors((prev) => {
        if (prev[key] === message) return prev;
        const next = { ...prev };
        if (message) next[key] = message;
        else delete next[key];
        return next;
      });
    },
    [schema, payload],
  );

  /** Element id for a field key (`<idPrefix>-<key>`, or the key itself without a prefix). */
  const fieldId = useCallback((key: string) => (idPrefix ? `${idPrefix}-${key}` : key), [idPrefix]);

  /**
   * Props for a text-like input bound to `key`: id (= fieldId(key), so ErrorSummary links
   * resolve), name, value, change and blur-validation. For chips/checkbox/file, pass
   * `id={fieldId(key)}` yourself.
   */
  const field = useCallback(
    (key: keyof Values<S> & string) => ({
      id: fieldId(key),
      name: key,
      value: (values[key] as string | undefined) ?? '',
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setValue(key, e.target.value),
      onBlur: () => validateField(key),
    }),
    [values, setValue, validateField, fieldId],
  );

  const submit = useCallback(
    (fn: (data: z.output<S>) => Promise<unknown> | unknown) => async (e?: FormEvent) => {
      e?.preventDefault();
      if (inFlight.current) return;
      setFormError(null);
      const res = schema.safeParse(payload(valuesRef.current));
      if (!res.success) {
        setErrors(issuesToErrors(res.error.issues));
        setFailedSubmits((n) => n + 1);
        return;
      }
      setErrors({});
      inFlight.current = true;
      setSubmitting(true);
      try {
        await fn(res.data);
        requestId.current = uuid();
      } catch (err) {
        if (err instanceof ApiFieldError) {
          setErrors(err.fields);
        } else {
          setFormError(err instanceof Error && err.message ? err.message : GENERIC_ERROR);
        }
        setFailedSubmits((n) => n + 1);
      } finally {
        inFlight.current = false;
        setSubmitting(false);
      }
    },
    [schema, payload],
  );

  return {
    values,
    setValue,
    errors,
    setErrors,
    formError,
    submitting,
    failedSubmits,
    field,
    fieldId,
    validateField,
    submit,
    get requestId() {
      return requestId.current as string;
    },
  };
}
