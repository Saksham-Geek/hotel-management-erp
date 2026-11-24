import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import os from 'node:os';
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

  // For mobile phones scanning the QR code, 0.0.0.0 or localhost is completely unroutable.
  // We MUST route through the machine's actual Wi-Fi / LAN IP (e.g. 192.168.1.9).
  const isUnroutableHost =
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '0.0.0.0' ||
    url.hostname === '::' ||
    url.hostname === '::1';

  const targetHost = lanIp ? `${lanIp}${port}` : (isUnroutableHost ? `127.0.0.1${port}` : url.host);
  const phoneOrigin = `${protocol}//${targetHost}`;

  return NextResponse.json({
    sessionId: session.id,
    expiresAt: session.expiresAt,
    scanUrl: `${phoneOrigin}/scan-id/${session.id}`,
    localhostUrl: `${url.origin}/scan-id/${session.id}`,
    lanIp: lanIp || null,
    port: url.port || '3000',
  });
}
