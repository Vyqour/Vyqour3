import type { NextConfig } from 'next';

/**
 * Browser calls same-origin `/api/v1/*` (no CORS).
 * Next.js rewrites those to the Nest process.
 *
 * Codespaces: set INTERNAL_API_URL=http://127.0.0.1:4000 (default)
 * so the rewrite never depends on the public -4000 tunnel.
 */
const internalApiOrigin = (
  process.env.INTERNAL_API_URL ||
  process.env.API_PROXY_TARGET ||
  'http://127.0.0.1:4000'
).replace(/\/+$/, '');

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${internalApiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
