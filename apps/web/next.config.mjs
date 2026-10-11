import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const here = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ['@erp/shared'],
  // Keep tracing rooted at the monorepo for workspace dependencies. Standalone
  // packaging is not used by this repository and requires symlink creation on Windows.
  outputFileTracingRoot: resolve(here, '../..'),
  poweredByHeader: false,
};
