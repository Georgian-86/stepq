import Link from 'next/link';
import { GUTTER } from '@/components/site/links';
import { ModalLink } from '@/components/site/ModalLink';
import { Piko } from '@/components/site/Piko';
import { Reveal } from '@/components/site/Reveal';
import { buttonClass } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';
import { BackersWall } from './BackersWall';

const WAYS: { icon: IconName; title: string; body: string; cta: string; href: string }[] = [
  {
    icon: 'briefcase-ink',
    title: 'Join the team',
    body: 'Apply for an unpaid internship on the StepQ team. Open roles in design, marketing, content and tech, each with its own job description.',
    cta: 'See open roles',
    href: '/join-the-team',
  },
  {
    icon: 'rupee-ink',
    title: 'Fund StepQ',
    body: 'Back StepQ with any amount over UPI. Once your payment is verified, your name goes on our sponsor wall.',
    cta: 'Fund StepQ',
    href: '/fund',
  },
  {
    icon: 'megaphone-ink',
    title: 'Become an ambassador',
    body: 'Bring StepQ to your campus, office or housing society, and start the first walking groups there. T&C apply.',
    cta: 'Apply to be an ambassador',
    href: '/ambassadors',
  },
];

/** W01 "Help build StepQ before launch" (`9:193`), backers wall and founder strip. */
export function HelpBuild() {
  return (
    <section aria-labelledby="help-title" className="bg-page">
      <div
        className={`mx-auto flex max-w-[1440px] flex-col gap-xl py-[56px] lg:py-[88px] ${GUTTER}`}
      >
        <h2
          id="help-title"
          className="type-web-h1 text-ink max-md:text-[36px] max-md:leading-[42px]"
        >
          Help build StepQ before launch
        </h2>
        <p className="type-web-lead text-muted">Three ways to be part of StepQ from day one.</p>
        <ul className="grid items-start gap-l lg:grid-cols-3">
          {WAYS.map((w, i) => (
            <li key={w.title}>
              <Reveal index={i}>
                <div className="flex flex-col items-start gap-[14px] rounded-l edge bg-white p-[33.5px]">
                  <span className="flex rounded-pill bg-mango-soft p-[12px]">
                    <Icon name={w.icon} />
                  </span>
                  <h3 className="type-web-h3 text-ink">{w.title}</h3>
                  <p className="type-web-body text-muted">{w.body}</p>
                  <Link href={w.href} className={buttonClass('primary')}>
                    {w.cta}
                  </Link>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
        <BackersWall />
        <div className="flex flex-col items-start gap-l rounded-l bg-leaf-soft px-l py-[28px] md:flex-row md:items-center md:gap-[28px] md:px-xl">
          <Piko mood="happy" size={96} />
          <div className="flex min-w-0 flex-1 flex-col gap-[6px]">
            <h3 className="type-web-h3 text-ink">Talk to the founder</h3>
            <p className="type-web-body text-muted">
              Ideas, partnerships, feedback or investment? Write to the founder directly. Your
              message goes to connect@stepq.in.
            </p>
          </div>
          <ModalLink modal="founder" className={buttonClass('primary', 'shrink-0')}>
            Connect with the founder
          </ModalLink>
        </div>
      </div>
    </section>
  );
}
