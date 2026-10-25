'use client';

import { AGE_GROUPS, AGE_LABELS, GENDER_LABELS, GENDERS, waitlistInput } from '@stepq/schemas';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { ErrorSummary } from '@/components/ui/ErrorSummary';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { call } from '@/lib/api';
import { openModalParam } from '@/lib/useModalParam';
import { useZodForm } from '@/lib/useZodForm';
import { waitlistSource } from './source';
import { useWaitlist } from './WaitlistState';

const genderOptions = GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }));
const ageOptions = AGE_GROUPS.map((value) => ({ value, label: AGE_LABELS[value] }));
const LABELS = { name: 'Full name', email: 'Email', gender: 'Gender', ageGroup: 'Age group' };

/** Waitlist form card (W01 `9:126`). A join opens W02 (`?modal=reserve`). */
export function WaitlistCard() {
  return (
    <section
      id="waitlist"
      aria-labelledby="waitlist-title"
      className="w-full scroll-mt-l rounded-(--radius-form) bg-white p-l shadow-card sm:p-[36px] lg:w-[500px]"
    >
      <WaitlistForm idPrefix="waitlist" headingId="waitlist-title" />
    </section>
  );
}

/**
 * The waitlist form itself, shared by the W01 card and the timed pop-up. `idPrefix` keeps field
 * ids unique when both are on the page; `onJoined` runs before W02 opens.
 */
export function WaitlistForm({
  idPrefix,
  headingId,
  onJoined,
}: {
  idPrefix: string;
  headingId: string;
  onJoined?: () => void;
}) {
  const form = useZodForm(waitlistInput, { idPrefix });
  const { setJoin } = useWaitlist();
  const { setValue } = form;

  // `ref` / `utm_*` from the landing URL (e.g. via /join) go into waitlist.source.
  useEffect(() => {
    const source = waitlistSource(window.location.search);
    if (source) setValue('source', source);
  }, [setValue]);

  const onSubmit = form.submit(async (data) => {
    const res = await call('joinWaitlist', data);
    setJoin(res);
    onJoined?.();
    openModalParam('reserve');
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-[20px]">
      <h2 id={headingId} className="type-web-h2 text-ink">
        Join the waitlist
      </h2>
      <p className="type-web-body text-muted">
        Be first in when StepQ launches. After you join, you can reserve your username.
      </p>
      <ErrorSummary
        errors={form.errors}
        labels={LABELS}
        fieldId={form.fieldId}
        submitCount={form.failedSubmits}
      />
      <Field
        label="Full name"
        autoComplete="name"
        {...form.field('name')}
        error={form.errors.name}
      />
      <Field
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        spellCheck={false}
        {...form.field('email')}
        error={form.errors.email}
      />
      <ChipGroup
        id={form.fieldId('gender')}
        label="Gender"
        options={genderOptions}
        value={form.values.gender as (typeof GENDERS)[number] | undefined}
        onChange={(v) => form.setValue('gender', v)}
        onBlur={() => form.validateField('gender')}
        error={form.errors.gender}
      />
      <ChipGroup
        id={form.fieldId('ageGroup')}
        label="Age group"
        options={ageOptions}
        value={form.values.ageGroup as (typeof AGE_GROUPS)[number] | undefined}
        onChange={(v) => form.setValue('ageGroup', v)}
        onBlur={() => form.validateField('ageGroup')}
        error={form.errors.ageGroup}
      />
      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" {...form.field('website')} />
        </label>
      </div>
      <Button type="submit" loading={form.submitting} className="w-full">
        Join the waitlist
      </Button>
      {form.formError && (
        <p role="alert" className="type-web-small text-tomato-text">
          {form.formError}
        </p>
      )}
      <p className="type-web-small flex items-center gap-s text-muted">
        <Icon name="lock-muted" />
        We only email you about StepQ. No spam, ever.
      </p>
    </form>
  );
}
