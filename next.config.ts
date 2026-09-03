import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/backend-api/v1/:path*',
        destination: 'https://backend-umber-eight-77.vercel.app/api/v1/:path*',
      },
      {
        source: '/backend-docs',
        destination: 'https://backend-umber-eight-77.vercel.app/api/docs',
      },
    ];
  },
};

export default nextConfig;
