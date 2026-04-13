/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  // Standalone output for Docker deployment
  output: 'standalone',
  // Fix workspace root detection warning
  outputFileTracingRoot: path.join(__dirname),
  images: {
    domains: ['*.supabase.co', 'api.dicebear.com', 'avatars.githubusercontent.com'],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8000/api/v1/:path*',
      },
      {
        source: '/docs',
        destination: 'http://127.0.0.1:8000/docs',
      },
      {
        source: '/health',
        destination: 'http://127.0.0.1:8000/health',
      },
    ];
  },
};

module.exports = nextConfig;
