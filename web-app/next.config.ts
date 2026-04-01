import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://stockman-production-149d.up.railway.app/api/:path*',
      },
      {
        source: '/__/auth/:path*',
        destination: 'https://stockman-8a6aa.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/__/auth/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/((?!__/auth).*)',
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com https://*.firebaseapp.com https://*.googleapis.com https://www.gstatic.com",
              "script-src-elem 'self' 'unsafe-inline' https://apis.google.com https://accounts.google.com https://*.firebaseapp.com https://*.googleapis.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://www.gstatic.com",
              "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://accounts.google.com https://www.gstatic.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: https:",
              "connect-src 'self' https://stockman-production-149d.up.railway.app https://*.googleapis.com https://*.firebaseio.com https://accounts.google.com wss://*.firebaseio.com",
              "frame-src 'self' https://stockman.pro https://accounts.google.com https://*.firebaseapp.com",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
