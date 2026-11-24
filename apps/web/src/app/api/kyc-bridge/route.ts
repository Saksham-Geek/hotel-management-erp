import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { TOKEN_COOKIE } from '@/lib/api';
import { createKycBridgeSession } from '@/lib/kyc-bridge-store';

function getLocalNetworkIp(): string | null {
  const interfaces = os.networkInterfaces();
  // Prefer Wi-Fi / Ethernet 192.168.x or 10.x LAN interfaces
  for (const name of Object.keys(interfaces)) {
    if (/virtual|wsl|hyper-v|bluetooth|loopback/i.test(name)) continue;
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal && (net.address.startsWith('192.168.') || net.address.startsWith('10.'))) {
        return net.address;
      }
    }
  }
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('127.')) {
        return net.address;
      }
    }
  }
  return null;
}

/**
 * POST /api/kyc-bridge
 * Initiated by desktop/laptop browser to request an ephemeral QR bridge session
 */
export async function POST(request: Request) {
  const token = (await cookies()).get(TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthorized. Staff session required.' }, { status: 401 });
  }

  const session = createKycBridgeSession();
  const url = new URL(request.url);
  const protocol = url.protocol;
  const port = url.port ? `:${url.port}` : '';
  const lanIp = getLocalNetworkIp();

  // Check if a tunnel URL is active
  let tunnelUrl: string | null = null;
  try {
    const tunnelPath = path.join(process.cwd(), '.tunnel-url');
    if (fs.existsSync(tunnelPath)) {
      tunnelUrl = fs.readFileSync(tunnelPath, 'utf8').trim();
    }
  } catch {}

  // For mobile phones scanning the QR code, 0.0.0.0 or localhost is completely unroutable.
  // We only route through local LAN IP when developing locally on unroutable hosts.
  const isUnroutableHost =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '0.0.0.0' ||
    url.hostname === '::' ||
    url.hostname === '::1';

  // Support reverse proxies (Nginx, Cloudflare, Vercel, AWS ALB)
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const forwardedHost = request.headers.get('x-forwarded-host');
  const effectiveOrigin = forwardedHost
    ? `${forwardedProto || 'https'}://${forwardedHost}`
    : url.origin;

  const phoneOrigin = isUnroutableHost && lanIp ? `${protocol}//${lanIp}${port}` : effectiveOrigin;

  return NextResponse.json({
    sessionId: session.id,
    expiresAt: session.expiresAt,
    scanUrl: `${phoneOrigin}/scan-id/${session.id}`,
    tunnelScanUrl: tunnelUrl ? `${tunnelUrl}/scan-id/${session.id}` : null,
    tunnelUrl: tunnelUrl || null,
    localhostUrl: `${url.origin}/scan-id/${session.id}`,
    lanIp: lanIp || null,
    port: url.port || '3000',
  });
}
