import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lint runs once from the repo root (`pnpm lint`, flat config).
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@stepq/tokens', '@stepq/schemas', '@stepq/core', '@stepq/brand'],
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
