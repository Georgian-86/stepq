import { GUTTER } from '@/components/site/links';
import { Icon } from '@/components/ui/Icon';
import { WaitlistCard } from '@/features/waitlist/WaitlistCard';
import { LiveCount } from './LiveCount';
import { PikoIntro } from './PikoIntro';

/** W01 hero (`9:99`): copy, live count and walking Piko on leaf; the waitlist card on the right. */
export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="overflow-hidden bg-leaf">
      <div
        className={`mx-auto flex max-w-[1440px] flex-col gap-xl pt-[48px] lg:flex-row lg:items-end lg:gap-[64px] lg:pt-[80px] ${GUTTER}`}
      >
        <div className="flex min-w-0 flex-1 flex-col items-start gap-l">
          <p className="type-web-small-strong inline-flex items-center gap-s rounded-pill bg-white px-[14px] py-s text-ink">
            <Icon name="footprints-deep" />
            Launching soon on Android and iPhone
          </p>
          <h1
            id="hero-title"
            className="type-web-hero text-ink max-lg:text-[44px] max-lg:leading-[48px] max-lg:tracking-[-1px]"
          >
            Walking, made a happy daily habit.
          </h1>
          <p className="type-web-lead text-ink">
            <strong className="font-bold">Piko pays you to walk.</strong> StepQ turns your steps
            into a daily StepQ score, rewards every milestone you hit, and lets you walk with
            friends, groups and QRuns near you. Join the waitlist and be first in.
          </p>
          <LiveCount />
          <div className="pt-s">
            <PikoIntro />
          </div>
        </div>
        <div className="flex shrink-0 flex-col pb-[48px] lg:pb-[80px]">
          <WaitlistCard />
        </div>
      </div>
    </section>
  );
}
