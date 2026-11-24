import { NextResponse } from 'next/server';
import {
  getKycBridgeSession,
  uploadToKycBridgeSession,
  claimKycBridgeSession,
} from '@/lib/kyc-bridge-store';

/**
 * GET /api/kyc-bridge/[sessionId]
 * Polled by the desktop/laptop to detect when mobile upload completes
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const session = getKycBridgeSession(sessionId);

  if (!session) {
    return NextResponse.json(
      { status: 'expired', message: 'Bridge session has expired or does not exist.' },
      { status: 404 },
    );
  }

  if (session.status === 'uploaded' && session.data) {
    // Claim the uploaded data and discard the session
    const data = claimKycBridgeSession(sessionId);
    return NextResponse.json({
      status: 'uploaded',
      data,
    });
  }

  return NextResponse.json({
    status: session.status,
    expiresAt: session.expiresAt,
  });
}

/**
 * POST /api/kyc-bridge/[sessionId]
 * Called by the mobile browser to deliver the snapped photo to the laptop
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const session = getKycBridgeSession(sessionId);

  if (!session || session.status !== 'pending') {
    return NextResponse.json(
      { success: false, message: 'Session is invalid, already used, or expired. Please scan a fresh QR code.' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const { base64, mimeType, fileName, fileSize } = body;

    if (!base64 || typeof base64 !== 'string') {
      return NextResponse.json({ success: false, message: 'Missing photo payload' }, { status: 400 });
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMime.includes(mimeType)) {
      return NextResponse.json(
        { success: false, message: 'Unsupported format. Use JPEG, PNG or WebP.' },
        { status: 400 },
      );
    }

    // Hard payload limit: 6 MB base64 (~4.5 MB binary)
    if (base64.length > 7 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, message: 'Photo is too large. Max 5 MB allowed.' },
        { status: 400 },
      );
    }

    const success = uploadToKycBridgeSession(sessionId, {
      fileName: fileName || `kyc-snap-${Date.now()}.jpg`,
      mimeType: mimeType || 'image/jpeg',
      base64,
      fileSize: fileSize || Math.round((base64.length * 3) / 4),
    });

    if (!success) {
      return NextResponse.json(
        { success: false, message: 'Failed to record photo into bridge session.' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, message: 'Document sent to desk PC successfully.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
