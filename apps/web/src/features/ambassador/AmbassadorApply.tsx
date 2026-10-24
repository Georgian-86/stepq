'use client';

import { ambassadorInput } from '@stepq/schemas';
import { Suspense } from 'react';
import { useZodForm } from '@/lib/useZodForm';
import { AmbassadorForm } from './AmbassadorForm';
import { TermsModal } from './TermsModal';

/**
 * W09 form + W10 T&C. The form state lives here, above both, so opening and closing the
 * T&C keeps every typed value, and "I agree" ticks the box.
 */
export function AmbassadorApply() {
  const form = useZodForm(ambassadorInput, {
    idPrefix: 'ambassador',
    initial: { agreedToTerms: false },
  });
  const { setValue, setErrors } = form;

  function setAgreed(agreed: boolean) {
    setValue('agreedToTerms', agreed);
    if (!agreed) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next.agreedToTerms;
      return next;
    });
  }

  return (
    <>
      <AmbassadorForm form={form} setAgreed={setAgreed} />
      <Suspense fallback={null}>
        <TermsModal onAgree={() => setAgreed(true)} />
      </Suspense>
    </>
  );
}
