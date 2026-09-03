import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Allow local dev-origin access (desktop preview webviews commonly hit 127.0.0.1);
  // otherwise Next 16 blocks dev-only resources (fonts, HMR) as cross-origin.
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
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
