/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  reactStrictMode: true,
  images: {
    domains: ['sample-videos.com'],
  },
  experimental: {
    // Enable App Router
    appDir: true,
  },
  // Allow cross-origin requests from the IP mentioned in the warning
  allowedDevOrigins: [
    '50.19.10.82',
    'localhost',
    process.env.SERVER_IP,
    process.env.INTERNAL_SERVER_IP,
  ],
  // Environment variables that will be available at build time and runtime
  env: {
    NEXT_PUBLIC_SERVER_IP: process.env.SERVER_IP || '50.19.10.82',
  },
};

module.exports = nextConfig; 