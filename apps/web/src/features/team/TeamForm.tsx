'use client';

import { RESUME_MAX_BYTES, ROLE_LABELS, ROLES, teamApplicationInput } from '@stepq/schemas';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ErrorSummary } from '@/components/ui/ErrorSummary';
import { Field } from '@/components/ui/Field';
import { FileDrop } from '@/components/ui/FileDrop';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';
import { call } from '@/lib/api';
import type { useZodForm } from '@/lib/useZodForm';
import { RESUME_ERROR, readResume } from './resume';
import { SENT_KEY, sentHref } from './sent';

export type TeamFormState = ReturnType<typeof useZodForm<typeof teamApplicationInput>>;

export const NO_RESUME = { fileName: '', base64: '' };

const roleOptions = ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }));
const LABELS = {
  name: 'Full name',
  email: 'Email',
  phone: 'Contact number',
  role: 'Position applied for',
  resume: 'Resume',
  link: 'LinkedIn or portfolio',
  why: 'Why StepQ?',
};

/** `resume.fileName` / `resume.base64` schema errors show once, under the upload row. */
function collapseResume(errors: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(errors)) out[k.startsWith('resume.') ? 'resume' : k] ??= v;
  return out;
}

/** "linkedin.com/in/x" → "https://linkedin.com/in/x", so the schema's URL check passes. */
export function withScheme(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const v = value.trim();
  return v && !/^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? `https://${v}` : value;
}

/** W04 "Apply now" card (`10:190`). Success goes to W05 `/join-the-team/sent`. */
export function TeamForm({ form }: { form: TeamFormState }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [sent, setSent] = useState(false);
  const pick = useRef(0);
  const errors = collapseResume(form.errors);
  const { setValue, setErrors } = form;

  function setResumeError(message: string | undefined) {
    setErrors((prev) => {
      const next: Record<string, string> = {};
      for (const [k, v] of Object.entries(prev))
        if (k !== 'resume' && !k.startsWith('resume.')) next[k] = v;
      if (message) next.resume = message;
      return next;
    });
  }

  async function chooseResume(next: File | null) {
    const n = ++pick.current;
    setFile(null);
    setValue('resume', NO_RESUME);
    if (!next) return;
    try {
      const resume = await readResume(next);
      if (n !== pick.current) return;
      setFile(next);
      setValue('resume', resume);
      setResumeError(undefined);
    } catch {
      if (n === pick.current) setResumeError(RESUME_ERROR);
    }
  }

  const submit = form.submit(async (data) => {
    const res = await call('submitTeamApplication', data);
    setSent(true);
    try {
      window.sessionStorage.setItem(SENT_KEY, data.email);
    } catch {
      // Storage blocked: W05 says "reply by email" instead.
    }
    router.push(sentHref(res.firstName, data.role));
  });

  return (
    <form
      onSubmit={(e) => {
        setValue('link', withScheme(form.values.link));
        return submit(e);
      }}
      noValidate
      aria-labelledby="apply-title"
      className="flex w-full flex-col gap-[20px] rounded-(--radius-form) bg-white p-l shadow-card sm:p-[36px] lg:w-[560px] lg:shrink-0"
    >
      <h2 id="apply-title" className="type-web-h2 text-ink">
        Apply now
      </h2>
      {/* Only after a submit: a blur or file error alone must not pull focus to the summary. */}
      <ErrorSummary
        errors={form.failedSubmits ? errors : {}}
        labels={LABELS}
        fieldId={form.fieldId}
        focusKey={form.failedSubmits}
      />
      <Field label="Full name" autoComplete="name" {...form.field('name')} error={errors.name} />
      <Field
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        spellCheck={false}
        {...form.field('email')}
        error={errors.email}
      />
      <Field
        label="Contact number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        {...form.field('phone')}
        error={errors.phone}
      />
      <Select
        label="Position applied for"
        options={roleOptions}
        placeholder="Choose a role"
        {...form.field('role')}
        error={errors.role}
      />
      <FileDrop
        id={form.fieldId('resume')}
        label="Resume"
        accept="application/pdf"
        maxBytes={RESUME_MAX_BYTES}
        value={file}
        onChange={chooseResume}
        onReject={() => {
          pick.current++;
          setFile(null);
          setValue('resume', NO_RESUME);
          setResumeError(RESUME_ERROR);
        }}
        error={errors.resume}
      />
      <Field
        label="LinkedIn or portfolio (optional)"
        type="url"
        inputMode="url"
        autoComplete="url"
        spellCheck={false}
        placeholder="linkedin.com/in/…"
        {...form.field('link')}
        onBlur={() => {
          setValue('link', withScheme(form.values.link));
          form.validateField('link');
        }}
        error={errors.link}
      />
      <TextArea
        label="Why StepQ?"
        placeholder="Tell us in a few lines why you want to join."
        rows={2}
        {...form.field('why')}
        error={errors.why}
      />
      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" {...form.field('website')} />
        </label>
      </div>
      <Button type="submit" loading={form.submitting || sent} className="w-full">
        Submit application
      </Button>
      {form.formError && (
        <p role="alert" className="type-web-small text-tomato-text">
          {form.formError}
        </p>
      )}
    </form>
  );
}
