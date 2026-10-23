export const NAV_LINKS = [
  { href: '/join-the-team', label: 'Join the team' },
  { href: '/fund', label: 'Fund StepQ' },
  { href: '/ambassadors', label: 'Ambassadors' },
] as const;

/** Home waitlist card anchor (Task 13 gives the card `id="waitlist"`). */
export const WAITLIST_HREF = '/#waitlist';

/** Side padding: 120 px at 1440 → 20 px on phones (spec §8). */
export const GUTTER = 'px-[20px] md:px-[48px] xl:px-[120px]';

/** Extends a link's target to 44 px tall (centred) without changing its box. Needs `relative`. */
export const HIT_44 =
  "relative after:absolute after:inset-x-0 after:top-1/2 after:h-[44px] after:-translate-y-1/2 after:content-['']";
