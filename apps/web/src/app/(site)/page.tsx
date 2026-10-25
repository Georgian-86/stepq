import { HelpBuild } from '@/features/home/HelpBuild';
import { Hero } from '@/features/home/Hero';
import { HowItWorks } from '@/features/home/HowItWorks';

/**
 * W01 Home · Before launch (`9:85`). W02/W03 (`?modal=reserve` / `?modal=reserved`) and the
 * waitlist state live in the site layout, so the timed pop-up can join from any page.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <HowItWorks />
      <HelpBuild />
    </>
  );
}
