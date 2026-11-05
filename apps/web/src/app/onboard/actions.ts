'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { API_URL, TOKEN_COOKIE } from '@/lib/api';

export async function selfOnboardAction(fd: FormData) {
  let error = '';
  let token: string | null = null;
  const name = String(fd.get('name') ?? '').trim();
  const slug = String(fd.get('slug') ?? '').trim().toLowerCase();
  const contactEmail = String(fd.get('contactEmail') ?? '').trim();
  const contactPhone = String(fd.get('contactPhone') ?? '').trim();
  const planKey = String(fd.get('planKey') ?? 'growth').trim();
  const ownerName = String(fd.get('ownerName') ?? '').trim();
  const ownerPassword = String(fd.get('ownerPassword') ?? '').trim();
  const initialFloors = parseInt(String(fd.get('initialFloors') ?? '3'), 10);
  const roomsPerFloor = parseInt(String(fd.get('roomsPerFloor') ?? '4'), 10);
  const seedInitialRooms = fd.get('seedInitialRooms') === 'true';

  try {
    const res = await fetch(`${API_URL}/platform/onboard-hotel`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({
        name,
        slug,
        contactEmail,
        contactPhone,
        planKey,
        ownerName,
        ownerPassword,
        initialFloors,
        roomsPerFloor,
        seedInitialRooms,
      }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      error = body?.message || 'Could not complete hotel registration. Please try another hotel code.';
    } else {
      // Auto login newly registered hotel owner
      const loginRes = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          tenant: slug,
          email: contactEmail,
          password: ownerPassword,
        }),
      });
      const loginData = await loginRes.json().catch(() => null);
      if (loginRes.ok && loginData?.token) {
        token = loginData.token;
      }
    }
  } catch (err: any) {
    console.error('Registration failed:', err);
    error = 'API server is currently unreachable. Please try again in a moment.';
  }

  if (token) {
    (await cookies()).set(TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    });
    redirect('/dashboard?ok=' + encodeURIComponent(`Welcome to Antigravity ERP! Your hotel '${name}' is live.`));
  }

  if (error) {
    redirect('/onboard?error=' + encodeURIComponent(error));
  }

  redirect('/login?ok=' + encodeURIComponent(`Hotel '${name}' registered successfully! Sign in with your credentials.`));
}
