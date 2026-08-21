import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/c2c-competitive-dashboard',
  images: { unoptimized: true },
};

export default nextConfig;
