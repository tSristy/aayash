/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    const backend = (process.env.AYASHMART_BACKEND_INTERNAL_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
    return [
      {
        source: '/api/admin/:path*',
        destination: `${backend}/api/admin/:path*`,
      },
      {
        source: '/uploads/:filename',
        destination: `${backend}/uploads/:filename`,
      },
    ];
  },
};
