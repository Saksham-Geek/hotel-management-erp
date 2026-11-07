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
    optimizePackageImports: ['@erp/shared'],
  },
  // Keep tracing rooted at the monorepo for workspace dependencies. Standalone
  // packaging is not used by this repository and requires symlink creation on Windows.
  outputFileTracingRoot: resolve(here, '../..'),
  poweredByHeader: false,
  async headers() {
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
