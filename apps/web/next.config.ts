import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lint runs once from the repo root (`pnpm lint`, flat config).
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@stepq/tokens', '@stepq/schemas', '@stepq/core', '@stepq/brand'],
  // Emailed links carry one-time tokens in the query: never send them to other sites.
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'Referrer-Policy', value: 'same-origin' }] }];
  },
};

export default nextConfig;
