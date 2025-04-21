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
  ],
};

module.exports = nextConfig; 