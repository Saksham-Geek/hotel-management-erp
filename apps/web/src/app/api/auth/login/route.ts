import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let tenant = '';
    let email = '';
    let password = '';

    if (contentType.includes('application/json')) {
      const body = await req.json();
      tenant = String(body.tenant || '').trim();
      email = String(body.email || '').trim();
      password = String(body.password || '');
    } else {
      const formData = await req.formData();
      tenant = String(formData.get('tenant') || '').trim();
      email = String(formData.get('email') || '').trim();
      password = String(formData.get('password') || '');
    }

    if (!tenant || !email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Please enter your property organization code, email, and password.' },
        { status: 400 },
      );
    }

    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ tenant, email, password }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok || !body?.token) {
      const errorMsg = body?.message || 'Invalid organization code, email, or password.';
      if (!contentType.includes('application/json')) {
        return NextResponse.redirect(
          new URL(`/login?error=${encodeURIComponent(errorMsg)}`, req.url),
          303,
        );
      }
      return NextResponse.json({ ok: false, error: errorMsg }, { status: res.status || 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set(TOKEN_COOKIE, body.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    });

    const tenantSlug = tenant.toLowerCase();
    const emailVal = email.toLowerCase();
    const redirectUrl =
      tenantSlug === 'platform-hq' ||
      emailVal === 'founder@antigravity-erp.com' ||
      emailVal === 'ops@antigravity-erp.com'
        ? '/platform-admin'
        : '/dashboard';

    // Handle standard browser form submit redirection
    if (!contentType.includes('application/json')) {
      return NextResponse.redirect(new URL(redirectUrl, req.url), 303);
    }

    return NextResponse.json({ ok: true, redirectUrl });
  } catch (err: unknown) {
    console.error('[API Auth Login Error]:', err);
    const errorMsg = 'API server (:4000) is unreachable. Check that API and database are running.';
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(errorMsg)}`, req.url),
        303,
      );
    }
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 503 });
  }
}
