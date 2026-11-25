import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

export async function POST(req: Request) {
  try {
    const { tenant, email, otp } = await req.json();
    const cleanTenant = String(tenant || '').trim();
    const cleanEmail = String(email || '').trim();
    const cleanOtp = String(otp || '').trim();

    if (!cleanTenant || !cleanEmail || !cleanOtp) {
      return NextResponse.json(
        { ok: false, error: 'Organization code, email, and OTP code are required.' },
        { status: 400 },
      );
    }

    const res = await fetch(`${API_URL}/auth/email-otp/verify`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ tenant: cleanTenant, email: cleanEmail, otp: cleanOtp }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.token) {
      return NextResponse.json(
        { ok: false, error: body?.message || 'Invalid or expired code.' },
        { status: res.status || 401 },
      );
    }

    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, body.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    const tenantSlug = cleanTenant.toLowerCase();
    const emailVal = cleanEmail.toLowerCase();
    const redirectUrl =
      tenantSlug === 'platform-hq' ||
      emailVal === 'founder@antigravity-erp.com' ||
      emailVal === 'ops@antigravity-erp.com'
        ? '/platform-admin'
        : '/dashboard';

    return NextResponse.json({ ok: true, redirectUrl });
  } catch (err) {
    console.error('[/api/auth/otp/verify] Error:', err);
    return NextResponse.json(
      { ok: false, error: 'API server (:4000) is unreachable. Check that API is running.' },
      { status: 502 },
    );
  }
}
