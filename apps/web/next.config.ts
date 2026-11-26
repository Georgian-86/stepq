import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lint runs once from the repo root (`pnpm lint`, flat config).
  eslint: { ignoreDuringBuilds: true },
  // Always inlined (Next leaves unset NEXT_PUBLIC_* vars as runtime lookups), so preview-only
  // code such as the callable simulator is dropped from live builds at compile time.
  env: {
    NEXT_PUBLIC_PREVIEW_MODE: process.env.NEXT_PUBLIC_PREVIEW_MODE ?? '',
    // How often live data (waitlist count, backers wall) is re-read; e2e builds use 1 s.
    NEXT_PUBLIC_PUBLIC_POLL_MS: process.env.NEXT_PUBLIC_PUBLIC_POLL_MS ?? '',
  },
  transpilePackages: [
    '@stepq/tokens',
    '@stepq/schemas',
    '@stepq/core',
    '@stepq/brand',
    '@stepq/emails',
  ],
  // A view prefetched on hover (admin dashboard) is used for at most 30 s, not Next's default
  // 5 min, so a click never shows numbers older than that. The public pages are static.
  experimental: { staleTimes: { static: 30 } },
  // The Postgres driver stays a plain Node require on the server.
  serverExternalPackages: ['pg', 'nodemailer'],
  // Emailed links carry one-time tokens in the query: never send them to other sites.
  async headers() {
    const headers = [
      { key: 'Referrer-Policy', value: 'same-origin' },
      // HTTPS only, for two years, on stepq.in and its subdomains.
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      // No other site may frame these pages (clickjacking on the forms and /admin).
      { key: 'X-Frame-Options', value: 'DENY' },
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
      },
      // The site never needs these browser features.
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
      },
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    ];
    // Preview builds (no backend yet) must never be indexed.
    if (process.env.NEXT_PUBLIC_PREVIEW_MODE === '1') {
      headers.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });
    }
    return [{ source: '/:path*', headers }];
  },
};

export default nextConfig;
