'use client';

import { founderMessageInput, TOPIC_LABELS, TOPICS } from '@stepq/schemas';
import { Button } from '@/components/ui/Button';
import { ChipGroup } from '@/components/ui/ChipGroup';
import { ErrorSummary } from '@/components/ui/ErrorSummary';
import { Field } from '@/components/ui/Field';
import { TextArea } from '@/components/ui/TextArea';
import { call } from '@/lib/api';
import { useZodForm } from '@/lib/useZodForm';

export type Topic = (typeof TOPICS)[number];

export const isTopic = (t: unknown): t is Topic => (TOPICS as readonly unknown[]).includes(t);

const topicOptions = TOPICS.map((value) => ({ value, label: TOPIC_LABELS[value] }));
const LABELS = {
  name: 'Your name',
  email: 'Email',
  phone: 'Phone',
  topic: 'What is it about?',
  message: 'Message',
};

export const FOUNDER_TITLE_ID = 'founder-title';

/** W16 Connect with the founder (`30:1322`): the form inside FounderModal. */
export function FounderForm({
  topic,
  onSent,
  onCancel,
}: {
  topic: Topic | null;
  onSent: (firstName: string) => void;
  onCancel: () => void;
}) {
  const form = useZodForm(founderMessageInput, {
    idPrefix: 'founder',
    initial: topic ? { topic } : {},
  });
  const { errors } = form;

  const submit = form.submit(async (data) => {
    const res = await call('sendFounderMessage', data);
    onSent(res.firstName);
  });

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-[18px]">
      <h2 id={FOUNDER_TITLE_ID} className="type-web-h2 text-ink">
        Connect with the founder
      </h2>
      <p className="type-web-body text-muted">
        Ideas, partnerships, feedback or investment? Your message goes straight to the founder at
        connect@stepq.in.
      </p>
      <ErrorSummary
        errors={errors}
        labels={LABELS}
        fieldId={form.fieldId}
        submitCount={form.failedSubmits}
      />
      <Field label="Your name" autoComplete="name" {...form.field('name')} error={errors.name} />
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
        label="Phone (optional)"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        {...form.field('phone')}
        error={errors.phone}
      />
      <ChipGroup
        id={form.fieldId('topic')}
        label="What is it about?"
        options={topicOptions}
        value={form.values.topic as Topic | undefined}
        onChange={(v) => form.setValue('topic', v)}
        onBlur={() => form.validateField('topic')}
        error={errors.topic}
        tight
      />
      <TextArea
        label="Message"
        rows={3}
        controlClassName="h-[104px] px-[15.5px] py-[13.5px]"
        {...form.field('message')}
        error={errors.message}
      />
      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" {...form.field('website')} />
        </label>
      </div>
      <Button type="submit" loading={form.submitting} className="w-full">
        Send to the founder
      </Button>
      {form.formError && (
        <p role="alert" className="type-web-small text-tomato-text">
          {form.formError}
        </p>
      )}
      <Button variant="text" className="self-start" onClick={onCancel}>
        Cancel
      </Button>
      <p className="type-web-small text-muted">
        Your message is emailed to connect@stepq.in. StepQ never shares your details.
      </p>
    </form>
  );
}
