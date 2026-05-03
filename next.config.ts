import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: 'standalone',
  
  // Disable React Compiler to reduce memory usage
  reactCompiler: false,
  
  // Optimize for development
  experimental: {
    // Disable Turbopack if memory issues persist
    // turbo: false,
  },
  
  // Optimize images - use remotePatterns instead of deprecated domains
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'openalex.org',
      },
    ],
  },
};

export default nextConfig;
