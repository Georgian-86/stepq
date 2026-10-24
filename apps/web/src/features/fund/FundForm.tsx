'use client';

import { AMOUNT_PRESETS, backingInput } from '@stepq/schemas';
import { useRouter } from 'next/navigation';
import { useRef, useState, type ChangeEvent } from 'react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { ErrorSummary } from '@/components/ui/ErrorSummary';
import { Field } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { call } from '@/lib/api';
import { detectPlatform, type Platform } from '@/lib/platform';
import { useZodForm } from '@/lib/useZodForm';
import { formatInr, parseAmount, payLabel, thankYouHref } from './amount';
import { openUpiLink } from './handoff';
import { IosUpiSheet } from './IosUpiSheet';
import { PayModal } from './PayModal';

type Choice = `${(typeof AMOUNT_PRESETS)[number]}` | 'other';

/** Figma's sample state: ₹501 selected (`10:384`). */
const DEFAULT_AMOUNT = 501;

const CHIPS: { value: Choice; label: string }[] = [
  ...AMOUNT_PRESETS.map((n) => ({ value: `${n}` as Choice, label: formatInr(n) })),
  { value: 'other', label: 'Other' },
];

const LABELS = {
  name: 'Name',
  phone: 'Contact number',
  amount: 'Amount',
  showOnWall: 'Show my name on the sponsor wall',
};

interface Payment {
  amount: number;
  upiLink: string;
  platform: Platform;
}

/**
 * W06 "Your details" (`10:373`). Pay records the backing (`recordBacking`), then hands over to
 * UPI: desktop → W07 QR modal; Android → the `upi://` link (the OS app chooser, M01) with
 * "I've paid" / Back here; iOS → the M01 app sheet. "I've paid" goes to W08.
 */
export function FundForm() {
  const router = useRouter();
  const form = useZodForm(backingInput, {
    idPrefix: 'fund',
    initial: { amount: DEFAULT_AMOUNT, showOnWall: true },
  });
  const { values, errors, setValue, setErrors, validateField } = form;
  const [choice, setChoice] = useState<Choice>(`${DEFAULT_AMOUNT}`);
  const [amountText, setAmountText] = useState(`${DEFAULT_AMOUNT}`);
  const [payment, setPayment] = useState<Payment | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  /** Any edit after the Android hand-off goes back to the form (the shown link is stale). */
  const resetHandoff = () => setPayment((p) => (p?.platform === 'android' ? null : p));
  const edited = (props: ReturnType<typeof form.field>) => ({
    ...props,
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      resetHandoff();
      props.onChange(e);
    },
  });

  function choose(next: Choice) {
    resetHandoff();
    setChoice(next);
    if (next === 'other') {
      setAmountText('');
      setValue('amount', undefined);
      amountRef.current?.focus();
    } else {
      setAmountText(next);
      setValue('amount', Number(next));
      // A preset is always valid: drop a stale "Enter an amount".
      setErrors((prev) => {
        const next = { ...prev };
        delete next.amount;
        return next;
      });
    }
  }

  function typeAmount(text: string) {
    resetHandoff();
    setChoice('other');
    setAmountText(text);
    setValue('amount', parseAmount(text));
  }

  const submit = form.submit(async (data) => {
    const res = await call('recordBacking', data);
    const platform = detectPlatform();
    setPayment({ amount: res.amount, upiLink: res.upiLink, platform });
    // Android: the OS shows its own UPI app chooser (M01) for a upi:// navigation. Chrome may
    // block this after the await (no user activation); "Open UPI app" below is the fallback.
    if (platform === 'android') openUpiLink(res.upiLink);
  });

  const paid = () => {
    if (payment) router.push(thankYouHref(payment.amount));
  };
  const close = () => setPayment(null);

  return (
    <>
      <form
        onSubmit={submit}
        noValidate
        aria-labelledby="fund-title"
        className="flex w-full flex-col gap-[20px] rounded-(--radius-form) bg-white p-l shadow-card sm:p-[36px] lg:w-[520px] lg:shrink-0"
      >
        <h2 id="fund-title" className="type-web-h2 text-ink">
          Your details
        </h2>
        <ErrorSummary
          errors={errors}
          labels={LABELS}
          fieldId={form.fieldId}
          submitCount={form.failedSubmits}
        />
        <Field
          label="Name"
          autoComplete="name"
          {...edited(form.field('name'))}
          error={errors.name}
        />
        <Field
          label="Contact number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          {...edited(form.field('phone'))}
          error={errors.phone}
        />
        <ChipGroup
          id={form.fieldId('amountChoice')}
          label="Amount"
          options={CHIPS}
          value={choice}
          onChange={choose}
        />
        <Field
          ref={amountRef}
          id={form.fieldId('amount')}
          name="amount"
          label="Or enter an amount (₹)"
          inputMode="numeric"
          autoComplete="off"
          value={amountText}
          onChange={(e) => typeAmount(e.target.value)}
          onBlur={() => validateField('amount')}
          error={errors.amount}
        />
        <Checkbox
          id={form.fieldId('showOnWall')}
          name="showOnWall"
          label="Show my name on the sponsor wall"
          checked={values.showOnWall === true}
          onChange={(checked) => {
            resetHandoff();
            setValue('showOnWall', checked);
          }}
        />
        {/* Honeypot: invisible to people, tempting to bots. */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input tabIndex={-1} autoComplete="off" {...form.field('website')} />
          </label>
        </div>
        {payment?.platform === 'android' ? (
          <div className="flex flex-col items-center gap-xs">
            <a href={payment.upiLink} className={buttonClass('primary', 'w-full')}>
              Open UPI app
            </a>
            <Button variant="text" className="min-h-[44px] w-full" onClick={paid}>
              I&apos;ve paid
            </Button>
            <Button variant="text" className="min-h-[44px] px-xs py-[10px]" onClick={close}>
              Back
            </Button>
          </div>
        ) : (
          <Button type="submit" loading={form.submitting} className="w-full">
            {payLabel(values.amount)}
          </Button>
        )}
        {form.formError && (
          <p role="alert" className="type-web-small text-tomato-text">
            {form.formError}
          </p>
        )}
        <p className="type-web-small flex gap-s text-muted">
          <Icon name="lock-muted" className="mt-[2px]" />
          We record each tap on Pay with your name, amount and time, so StepQ can match it to your
          UPI payment.
        </p>
      </form>
      <PayModal
        payment={payment?.platform === 'desktop' ? payment : null}
        onPaid={paid}
        onClose={close}
      />
      <IosUpiSheet
        payment={payment?.platform === 'ios' ? payment : null}
        onPaid={paid}
        onClose={close}
      />
    </>
  );
}
