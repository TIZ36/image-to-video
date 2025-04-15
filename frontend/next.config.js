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
};

module.exports = nextConfig; 