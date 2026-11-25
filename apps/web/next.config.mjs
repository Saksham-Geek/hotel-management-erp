import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ['@erp/shared'],
  compress: true,
  httpAgentOptions: {
    keepAlive: true,
  },
  experimental: {
    serverActions: { bodySizeLimit: '56mb' },
  },
  // Keep tracing rooted at the monorepo for workspace dependencies. Standalone
  // packaging is not used by this repository and requires symlink creation on Windows.
  outputFileTracingRoot: resolve(here, '../..'),
  poweredByHeader: false,
  async redirects() {
    return [
      // Room Calendar primary routing & aliases
      { source: '/room-calander', destination: '/room-calendar', permanent: false },
      { source: '/tape-chart', destination: '/room-calendar', permanent: false },
      { source: '/room-rack', destination: '/room-calendar', permanent: false },
      { source: '/calendar', destination: '/room-calendar', permanent: false },

      // Front Desk & Operations aliases
      { source: '/front-desk', destination: '/dashboard', permanent: false },
      { source: '/today', destination: '/dashboard', permanent: false },
      { source: '/bookings', destination: '/reservations', permanent: false },
      { source: '/floors', destination: '/rooms', permanent: false },
      { source: '/guest-directory', destination: '/guests', permanent: false },
      { source: '/payments', destination: '/billing', permanent: false },
      { source: '/bills', destination: '/billing', permanent: false },
      { source: '/petty-cash', destination: '/expenses', permanent: false },
      { source: '/events', destination: '/banquets', permanent: false },
      { source: '/dining', destination: '/restaurant', permanent: false },
      { source: '/room-keys', destination: '/keycards', permanent: false },
      { source: '/locks', destination: '/keycards', permanent: false },
      { source: '/cleaning', destination: '/housekeeping', permanent: false },
      { source: '/police-reports', destination: '/compliance', permanent: false },
      { source: '/boi', destination: '/compliance', permanent: false },

      // Management & Setup aliases
      { source: '/stores', destination: '/inventory', permanent: false },
      { source: '/stock', destination: '/inventory', permanent: false },
      { source: '/city-ledger', destination: '/corporate', permanent: false },
      { source: '/otas', destination: '/channel-manager', permanent: false },
      { source: '/booking-sites', destination: '/channel-manager', permanent: false },
      { source: '/loyalty', destination: '/marketing', permanent: false },
      { source: '/offers', destination: '/marketing', permanent: false },
      { source: '/daily-closing', destination: '/night-audit', permanent: false },

      // Owner & Business aliases
      { source: '/revenue', destination: '/income', permanent: false },
      { source: '/hotel-branches', destination: '/super-admin', permanent: false },
      { source: '/branches', destination: '/super-admin', permanent: false },
      { source: '/subscription', destination: '/upgrade', permanent: false },
      { source: '/plans', destination: '/upgrade', permanent: false },
    ];
  },
  async headers() {
    if (process.env.NODE_ENV !== 'production') {
      return [];
    }
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
};
