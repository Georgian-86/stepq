import { GUTTER } from '@/components/site/links';
import { Reveal } from '@/components/site/Reveal';
import { Icon, type IconName } from '@/components/ui/Icon';

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'target-deep',
    title: 'Hit your StepQ score',
    body: 'Pick a daily goal from 5,000 to 12,000 steps. Your StepQ score shows how close you are.',
  },
  {
    icon: 'gift-deep',
    title: 'Earn while you walk',
    body: 'Piko rewards you for each step milestone you hit. More steps, more rewards.',
  },
  {
    icon: 'users-deep',
    title: 'Walk together',
    body: 'Friends, groups, water reminders, QRuns near you, and weekly and monthly challenges.',
  },
];

/** W01 "How StepQ works" (`9:169`). */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-title">
      <div
        className={`mx-auto flex max-w-[1440px] flex-col gap-xl py-[56px] lg:py-[88px] ${GUTTER}`}
      >
        <h2
          id="how-title"
          className="type-web-h1 text-ink max-md:text-[36px] max-md:leading-[42px]"
        >
          How StepQ works
        </h2>
        <ul className="grid items-start gap-l lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Reveal index={i}>
                <div className="flex flex-col items-start gap-[14px] rounded-l bg-mint p-[28px]">
                  <span className="flex rounded-pill bg-white p-[12px]">
                    <Icon name={s.icon} />
                  </span>
                  <h3 className="type-web-h3 text-ink">{s.title}</h3>
                  <p className="type-web-body text-muted">{s.body}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
