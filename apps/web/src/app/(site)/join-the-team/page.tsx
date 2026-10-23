import type { Metadata } from 'next';
import { GUTTER } from '@/components/site/links';
import { JoinTeam } from '@/features/team/JoinTeam';

export const metadata: Metadata = {
  title: 'Join the team',
  description:
    'Unpaid internships for people who want to start a walking movement in India. Pick a role and apply.',
};

/** W04 Join the team (`10:127`). */
export default function JoinTheTeamPage() {
  return (
    <>
      <section aria-labelledby="team-title" className="bg-mint">
        <div
          className={`mx-auto flex max-w-[1440px] flex-col gap-m py-[48px] lg:py-[72px] ${GUTTER}`}
        >
          <h1
            id="team-title"
            className="type-web-hero text-ink max-lg:text-[44px] max-lg:leading-[48px] max-lg:tracking-[-1px]"
          >
            Join the StepQ team
          </h1>
          <p className="type-web-lead max-w-[760px] text-muted">
            Unpaid internships for people who want to start a walking movement in India. Pick a
            role, read its job description, and apply in five minutes.
          </p>
        </div>
      </section>
      <JoinTeam />
    </>
  );
}
