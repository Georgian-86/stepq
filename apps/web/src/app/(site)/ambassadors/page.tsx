import type { Metadata } from 'next';
import { GUTTER } from '@/components/site/links';
import { Icon } from '@/components/ui/Icon';
import { site } from '@/content/site';
import { AmbassadorApply } from '@/features/ambassador/AmbassadorApply';
import { PLACEHOLDER_ELIGIBILITY } from '@/features/ambassador/terms';

export const metadata: Metadata = {
  title: 'Become an ambassador',
  description:
    'Bring StepQ to your campus, office or housing society, and start the first walking groups there.',
};

const DUTIES = [
  'Start walking groups and QRuns in your area',
  'Share StepQ on campus, at work or in your society',
  'Tell the StepQ team what walkers near you need',
];

/** W09 Become an ambassador (`10:778`), with W10 T&C as `?modal=terms`. */
export default function AmbassadorsPage() {
  return (
    <div
      className={`mx-auto flex max-w-[1440px] flex-col items-stretch gap-[48px] py-[56px] lg:flex-row lg:items-start lg:gap-[64px] lg:py-[88px] ${GUTTER}`}
    >
      <section aria-labelledby="ambassador-title" className="flex min-w-0 flex-1 flex-col gap-l">
        <h1
          id="ambassador-title"
          className="type-web-hero text-ink max-lg:text-[44px] max-lg:leading-[48px] max-lg:tracking-[-1px]"
        >
          Become a StepQ ambassador
        </h1>
        <p className="type-web-lead text-muted">
          Bring StepQ to your campus, office or housing society. Ambassadors start the first walking
          groups and QRuns where they live and study.
        </p>
        <h2 className="type-web-h3 text-ink">What ambassadors do</h2>
        <ul className="flex flex-col gap-l">
          {DUTIES.map((d) => (
            <li key={d} className="type-web-body flex items-center gap-[10px] text-ink">
              <Icon name="check-deep" className="size-[20px] [&>svg]:size-full" />
              {d}
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-s rounded-(--radius-card) bg-mango-soft p-[20px]">
          <h2 className="type-web-body-strong text-ink">Who can apply</h2>
          <p className="type-web-small whitespace-pre-line text-muted">
            {site.ambassadorEligibility ?? PLACEHOLDER_ELIGIBILITY}
          </p>
        </div>
      </section>
      <AmbassadorApply />
    </div>
  );
}
