/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    const backend = (process.env.AYASHMART_BACKEND_INTERNAL_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');
    // One origin for the browser: admin, customer, courier webhooks and public API all go through Next.
    // That keeps cookies same-site and lets the admin Origin check pass.
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
      { source: '/uploads/:filename', destination: `${backend}/uploads/:filename` },
    ];
  },
};
