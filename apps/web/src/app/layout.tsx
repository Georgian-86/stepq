import '@fontsource/fredoka/500.css';
import '@fontsource/kalam/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { PREVIEW_MODE } from '@/lib/preview';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stepq.in'),
  title: { default: 'StepQ: a walking app for India', template: '%s · StepQ' },
  description:
    'A walking app for India. Walk with friends and earn rewards for every step milestone. Join the waitlist.',
  applicationName: 'StepQ',
  openGraph: {
    type: 'website',
    siteName: 'StepQ',
    locale: 'en_IN',
    url: '/',
    title: 'StepQ: a walking app for India',
    description: 'Walking, made a happy daily habit. Piko pays you to walk. Join the waitlist.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'StepQ: a walking app for India',
    description: 'Walking, made a happy daily habit. Piko pays you to walk. Join the waitlist.',
  },
  // Preview builds are for the client only (next.config.ts also sends X-Robots-Tag).
  ...(PREVIEW_MODE ? { robots: { index: false, follow: false } } : {}),
};

export const viewport: Viewport = {
  themeColor: '#FFFFFF',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-IN" data-scroll-behavior="smooth">
      <body className="min-h-dvh bg-white text-ink antialiased">{children}</body>
    </html>
  );
}
