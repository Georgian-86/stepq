import { Suspense, type ReactNode } from 'react';
import { Footer } from '@/components/site/Footer';
import { Nav } from '@/components/site/Nav';
import { FounderModal } from '@/features/founder/FounderModal';

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="type-web-small-strong sr-only z-50 rounded-pill bg-ink px-m py-s text-white focus:not-sr-only focus:fixed focus:top-s focus:left-s"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <Footer />
      {/* W16/W17 on every page (`?modal=founder`, e.g. footer "Collaborate with us"). */}
      <Suspense fallback={null}>
        <FounderModal />
      </Suspense>
    </>
  );
}
