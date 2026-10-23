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
      <div
        className={`mx-auto flex max-w-[1440px] flex-col gap-[40px] py-[48px] lg:flex-row lg:items-start lg:gap-[64px] lg:pt-[88px] lg:pb-[96px] ${GUTTER}`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-l">
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
          <ScanToPayCard />
        </div>
        <FundForm />
      </div>
    </section>
  );
}
