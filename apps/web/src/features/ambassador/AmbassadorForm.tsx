'use client';

import { ambassadorInput, FOLLOWERS, FOLLOWERS_LABELS } from '@stepq/schemas';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ModalLink } from '@/components/site/ModalLink';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { ErrorSummary } from '@/components/ui/ErrorSummary';
import { Field } from '@/components/ui/Field';
import { TextArea } from '@/components/ui/TextArea';
import { call } from '@/lib/api';
import type { useZodForm } from '@/lib/useZodForm';
import { receivedHref } from './received';

export type AmbassadorFormState = ReturnType<typeof useZodForm<typeof ambassadorInput>>;

type Followers = (typeof FOLLOWERS)[number];

const followerOptions = FOLLOWERS.map((value) => ({ value, label: FOLLOWERS_LABELS[value] }));
const LABELS = {
  name: 'Full name',
  email: 'Email',
  phone: 'Contact number',
  city: 'City',
  instagram: 'Instagram handle',
  followers: 'Followers',
  collegeOrCompany: 'College or company',
  plan: 'How will you promote StepQ?',
  agreedToTerms: 'Terms & Conditions',
};

/**
 * W09 "Apply" card (`10:812`). The state comes from the parent so the T&C modal (W10) can
 * tick the box and nothing typed is lost while it is open. Success goes to W11.
 */
export function AmbassadorForm({
  form,
  setAgreed,
}: {
  form: AmbassadorFormState;
  /** Sets the T&C box (and clears its error once ticked). */
  setAgreed: (agreed: boolean) => void;
}) {
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const { errors } = form;

  const submit = form.submit(async (data) => {
    const res = await call('submitAmbassador', data);
    setSent(true);
    router.push(receivedHref(res.firstName));
  });

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby="ambassador-apply-title"
      className="flex w-full flex-col gap-[20px] rounded-(--radius-form) bg-white p-l shadow-card sm:p-[36px] lg:w-[560px] lg:shrink-0"
    >
      <h2 id="ambassador-apply-title" className="type-web-h2 text-ink">
        Apply
      </h2>
      <ErrorSummary
        errors={errors}
        labels={LABELS}
        fieldId={form.fieldId}
        submitCount={form.failedSubmits}
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
      <Field
        label="City"
        autoComplete="address-level2"
        {...form.field('city')}
        error={errors.city}
      />
      <Field
        label="Instagram handle"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        {...form.field('instagram')}
        error={errors.instagram}
      />
      <ChipGroup
        id={form.fieldId('followers')}
        label="Followers"
        options={followerOptions}
        value={form.values.followers as Followers | undefined}
        onChange={(v) => form.setValue('followers', v)}
        onBlur={() => form.validateField('followers')}
        error={errors.followers}
      />
      <Field
        label="College or company"
        autoComplete="organization"
        {...form.field('collegeOrCompany')}
        error={errors.collegeOrCompany}
      />
      <TextArea
        label="How will you promote StepQ?"
        placeholder="A few lines about your plan."
        rows={2}
        {...form.field('plan')}
        error={errors.plan}
      />
      <Checkbox
        id={form.fieldId('agreedToTerms')}
        name="agreedToTerms"
        label="I agree to the ambassador"
        checked={form.values.agreedToTerms === true}
        onChange={setAgreed}
        error={errors.agreedToTerms}
      >
        <ModalLink
          modal="terms"
          className="type-web-small-strong relative inline-flex min-h-[44px] items-center px-xs text-deep underline-offset-2 hover:underline"
        >
          Terms &amp; Conditions
        </ModalLink>
      </Checkbox>
      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" {...form.field('website')} />
        </label>
      </div>
      <Button type="submit" loading={form.submitting || sent} className="w-full">
        Apply to be an ambassador
      </Button>
      {form.formError && (
        <p role="alert" className="type-web-small text-tomato-text">
          {form.formError}
        </p>
      )}
    </form>
  );
}
