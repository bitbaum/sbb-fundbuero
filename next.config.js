/** @type {import('next').NextConfig} */
// No `env` block here on purpose. Next already inlines every NEXT_PUBLIC_*
// variable into the client bundle; the block that used to sit here existed only
// to supply `|| 'http://localhost:3001'` defaults, which meant a production
// build shipped the visitor's own machine as the API host. Environment defaults
// belong in .env.development (dev only), never in a fallback that every build
// inherits. See lib/config.ts.
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
};

module.exports = nextConfig;
