import type { Metadata } from 'next';
import { GUTTER } from '@/components/site/links';
import { FundForm } from '@/features/fund/FundForm';
import { ScanToPayCard } from '@/features/fund/ScanToPayCard';

export const metadata: Metadata = {
  title: 'Fund StepQ',
  description:
    'Back StepQ with any amount over UPI. Once StepQ verifies your payment, your name joins the sponsor wall.',
};

const STEPS = [
  {
    title: 'Fill in your details',
    body: 'Your name, contact number and the amount you want to give.',
  },
  {
    title: 'Pay with any UPI app',
    body: 'On your phone, Pay opens your UPI app. On a computer, scan the QR code.',
  },
  {
    title: 'StepQ verifies and emails you',
    body: 'StepQ checks each payment and writes to you personally.',
  },
];

/** W06 Fund StepQ (`10:337`), with W07 / M01 opened by Pay. */
export default function FundPage() {
  return (
    <section aria-labelledby="fund-page-title" className="bg-mango-soft">
      {/* lg+: intro and scan card on the left, form on the right (Figma). Below lg the form
          comes right after the intro and the scan card last. */}
      <div
        className={`mx-auto grid max-w-[1440px] grid-cols-1 gap-[40px] py-[48px] lg:grid-cols-[minmax(0,1fr)_520px] lg:grid-rows-[auto_1fr] lg:gap-x-[64px] lg:gap-y-l lg:pt-[88px] lg:pb-[96px] ${GUTTER}`}
      >
        <div className="flex min-w-0 flex-col gap-l lg:col-start-1 lg:row-start-1">
          <h1
            id="fund-page-title"
            className="type-web-hero text-ink max-lg:text-[44px] max-lg:leading-[48px] max-lg:tracking-[-1px]"
          >
            Fund StepQ
          </h1>
          <p className="type-web-lead text-muted">
            Back StepQ with any amount. Once StepQ verifies your payment, you get a personal
            thank-you email and your name joins the sponsor wall.
          </p>
          <ol className="flex flex-col gap-l">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex items-start gap-m">
                <span
                  aria-hidden="true"
                  className="type-web-body-strong shrink-0 rounded-pill bg-mango px-[14px] py-[6px] text-ink"
                >
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-[2px]">
                  <h2 className="type-web-body-strong text-ink">{step.title}</h2>
                  <p className="type-web-small text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <FundForm />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2 lg:self-start">
          <ScanToPayCard />
        </div>
      </div>
    </section>
  );
}
