import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Limit webpack cache to 500 MB max to prevent unbounded disk growth
  webpack: (config, { dev }) => {
    if (dev && config.cache && typeof config.cache === 'object') {
      (config.cache as any).maxMemoryGenerations = 1;
      (config.cache as any).memoryCacheUnaffected = false;
    }
    return config;
  },
};

export default nextConfig;
