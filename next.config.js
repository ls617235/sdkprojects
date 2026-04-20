/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: async () => {
    return [
      {
        source: '/api/sdk/:path*',
        destination: 'http://127.0.0.1:8000/api/sdk/:path*',
      },
      {
        source: '/api/auth/:path*',
        destination: 'http://127.0.0.1:8000/api/auth/:path*',
      },
      {
        source: '/api/lingtong/:path*',
        destination: 'http://127.0.0.1:8000/api/lingtong/:path*',
      },
    ];
  },
};

module.exports = nextConfig;