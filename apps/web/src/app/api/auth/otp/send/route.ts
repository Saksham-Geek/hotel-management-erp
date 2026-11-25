import { NextResponse } from 'next/server';
import { API_URL } from '@/lib/api';

export async function POST(req: Request) {
  try {
    const { tenant, email } = await req.json();
    const cleanTenant = String(tenant || '').trim();
    const cleanEmail = String(email || '').trim();

    if (!cleanTenant || !cleanEmail) {
      return NextResponse.json(
        { ok: false, error: 'Property organization code and email are required.' },
        { status: 400 },
      );
    }

    const res = await fetch(`${API_URL}/auth/email-otp/send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ tenant: cleanTenant, email: cleanEmail }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: body?.message || 'Could not send verification code.' },
        { status: res.status || 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: body.message || 'Verification code sent.',
      devOtp: body.devOtp as string | undefined,
    });
  } catch (err) {
    console.error('[/api/auth/otp/send] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'API server (:4000) is unreachable. Check that API is running.' },
      { status: 502 },
    );
  }
}
