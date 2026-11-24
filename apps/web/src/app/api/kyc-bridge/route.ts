import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { TOKEN_COOKIE } from '@/lib/api';
import { createKycBridgeSession } from '@/lib/kyc-bridge-store';

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
  const origin = url.origin;

  return NextResponse.json({
    sessionId: session.id,
    expiresAt: session.expiresAt,
    scanUrl: `${origin}/scan-id/${session.id}`,
  });
}
