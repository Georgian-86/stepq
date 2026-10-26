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
  // The Postgres driver stays a plain Node require on the server.
  serverExternalPackages: ['pg', 'nodemailer'],
  // Emailed links carry one-time tokens in the query: never send them to other sites.
  async headers() {
    const headers = [{ key: 'Referrer-Policy', value: 'same-origin' }];
    // Preview builds (no backend yet) must never be indexed.
    if (process.env.NEXT_PUBLIC_PREVIEW_MODE === '1') {
      headers.push({ key: 'X-Robots-Tag', value: 'noindex, nofollow' });
    }
    return [{ source: '/:path*', headers }];
  },
};

export default nextConfig;
