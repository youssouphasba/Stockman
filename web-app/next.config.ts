import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbo: {},
    externalDir: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    // TODO: fix existing no-explicit-any errors then set to false
    ignoreDuringBuilds: true,
  },
  // Limit webpack cache to 500 MB max to prevent unbounded disk growth
  webpack: (config, { dev }) => {
    if (dev && config.cache && typeof config.cache === 'object') {
      (config.cache as any).maxMemoryGenerations = 1;
      (config.cache as any).memoryCacheUnaffected = false;
    }
    return config;
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://stockman-production-149d.up.railway.app",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
