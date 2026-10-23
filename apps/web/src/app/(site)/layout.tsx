import type { ReactNode } from 'react';
import { Footer } from '@/components/site/Footer';
import { Nav } from '@/components/site/Nav';

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
    </>
  );
}
