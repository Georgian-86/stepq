import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Lint runs once from the repo root (`pnpm lint`, flat config).
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@stepq/tokens', '@stepq/schemas', '@stepq/core', '@stepq/brand'],
};

export default nextConfig;
