import { NextResponse } from 'next/server';

const SVG_FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">
  <rect width="32" height="32" rx="8" fill="#080d1a"/>
  <path d="M6 26V9.5L16 5l10 4.5V26M4 26h24M11 11v2M16 11v2M21 11v2M11 17v2M16 17v9M21 17v2" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

export function GET() {
  return new NextResponse(SVG_FAVICON, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
}
