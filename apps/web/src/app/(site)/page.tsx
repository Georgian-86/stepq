import { Suspense } from 'react';
import { HelpBuild } from '@/features/home/HelpBuild';
import { Hero } from '@/features/home/Hero';
import { HowItWorks } from '@/features/home/HowItWorks';
import { WaitlistModals } from '@/features/waitlist/WaitlistModals';
import { WaitlistProvider } from '@/features/waitlist/WaitlistState';

/** W01 Home · Before launch (`9:85`), with W02/W03 as `?modal=reserve` / `?modal=reserved`. */
export default function HomePage() {
  return (
    <WaitlistProvider>
      <Hero />
      <HowItWorks />
      <HelpBuild />
      <Suspense fallback={null}>
        <WaitlistModals />
      </Suspense>
    </WaitlistProvider>
  );
}
