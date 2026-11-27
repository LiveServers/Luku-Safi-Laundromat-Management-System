const path = require('node:path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: { root: path.resolve(__dirname, '..') },
  images: { unoptimized: true },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://backend:5000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
