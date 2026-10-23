import Link from 'next/link';
import type { ReactNode } from 'react';
import { site, type SiteContent } from '@/content/site';
import { ModalLink } from './ModalLink';
import { GUTTER, HIT_44, WAITLIST_HREF } from './links';
import { Wordmark } from './Wordmark';

/** 40 px rows as in Figma; the pseudo-element extends the target 2 px above and below (44 px). */
const linkClass =
  "type-web-small relative inline-flex min-h-[40px] items-center px-xs text-ink hover:text-deep after:absolute after:inset-x-0 after:-inset-y-[2px] after:content-['']";

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <h2 className="type-label text-muted">{title}</h2>
      <ul className="flex flex-col gap-[2px]">{children}</ul>
    </div>
  );
}

/** Web footer (Figma `9:44`). Press kit stays hidden until it exists; null socials are hidden. */
export function Footer({ content = site }: { content?: SiteContent }) {
  const socials: [label: string, href: string][] = [];
  if (content.socials.instagram) socials.push(['Instagram', content.socials.instagram]);
  if (content.socials.linkedin) socials.push(['LinkedIn', content.socials.linkedin]);
  if (content.socials.youtube) socials.push(['YouTube', content.socials.youtube]);

  return (
    <footer className="bg-mint">
      <div
        className={`mx-auto flex max-w-[1440px] flex-col gap-[40px] pt-[64px] pb-[40px] ${GUTTER}`}
      >
        <div className="flex flex-col gap-[40px] md:flex-row md:flex-wrap md:gap-[64px]">
          <div className="flex flex-1 flex-col gap-[12px] md:min-w-[280px]">
            <Link href="/" aria-label="StepQ home" className={`self-start ${HIT_44}`}>
              <Wordmark size="footer" />
            </Link>
            <p className="type-web-body-strong text-ink">Chalo, chalte hain.</p>
            <p className="type-web-small text-muted">
              A walking app for India. Walk with friends <br className="hidden sm:inline" />
              and earn rewards for every step milestone.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-l gap-y-[40px] sm:flex sm:gap-[64px]">
            <Column title="Get involved">
              <li>
                <Link href={WAITLIST_HREF} className={linkClass}>
                  Join the waitlist
                </Link>
              </li>
              <li>
                <Link href="/join-the-team" className={linkClass}>
                  Join the team
                </Link>
              </li>
              <li>
                <Link href="/fund" className={linkClass}>
                  Fund StepQ
                </Link>
              </li>
              <li>
                <Link href="/ambassadors" className={linkClass}>
                  Become an ambassador
                </Link>
              </li>
            </Column>
            <Column title="Company">
              <li>
                <ModalLink modal="founder" params={{ topic: 'partnership' }} className={linkClass}>
                  Collaborate with us
                </ModalLink>
              </li>
              <li>
                <Link href="/privacy" className={linkClass}>
                  Privacy policy
                </Link>
              </li>
            </Column>
            <Column title="Contact">
              <li>
                <a href={`mailto:${content.contactEmail}`} className={linkClass}>
                  {content.contactEmail}
                </a>
              </li>
              {socials.map(([label, href]) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {label}
                  </a>
                </li>
              ))}
            </Column>
          </div>
        </div>
        <div className="type-web-small flex flex-col gap-s border-t border-line pt-[20px] text-muted md:flex-row md:justify-between">
          <p>© 2026 StepQ. Made in India.</p>
          <p>hello@stepq.in is a placeholder until StepQ confirms its address.</p>
        </div>
      </div>
    </footer>
  );
}
