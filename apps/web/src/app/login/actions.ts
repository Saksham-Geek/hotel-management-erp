'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { API_URL, api, errorMessage, TOKEN_COOKIE } from '@/lib/api';

async function storeToken(token: string) {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function login(formData: FormData) {
  let token: string | null = null;
  let error = 'Could not sign in. Try again in a moment';
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        tenant: String(formData.get('tenant') ?? '').trim(),
        email: String(formData.get('email') ?? '').trim(),
        password: String(formData.get('password') ?? ''),
      }),
    });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.token) token = body.token;
    else if (body?.message) error = body.message;
  } catch (err) {
    console.error('[Login] Error connecting to API:', err);
    error = 'API server (:4000) is unreachable. Check that API and database are running.';
  }
  if (!token) redirect('/login?error=' + encodeURIComponent(error));

  await storeToken(token);

  // Platform founder & cloud operations HQ land directly on SaaS Founder HQ (/platform-admin)
  // All hotel clients (Taj, ITC, Sayaji, Radisson, Grand Azure, etc.) land on Front Desk (/dashboard)
  const tenantSlug = String(formData.get('tenant') ?? '').trim().toLowerCase();
  const emailVal = String(formData.get('email') ?? '').trim().toLowerCase();
  if (
    tenantSlug === 'platform-hq' ||
    emailVal === 'founder@antigravity-erp.com' ||
    emailVal === 'ops@antigravity-erp.com'
  ) {
    redirect('/platform-admin');
  }

  redirect('/dashboard');
}

export async function selectProperty(fd: FormData) {
  const propertyId = String(fd.get('propertyId') ?? '').trim();
  if (!propertyId) redirect('/dashboard');
  const result = await api<{ token: string }>('/auth/select-property', {
    method: 'POST',
    body: JSON.stringify({ propertyId }),
  });
  await storeToken(result.token);
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function createProperty(fd: FormData) {
  const name = String(fd.get('name') ?? '').trim();
  const property = await api<{ id: string }>('/properties', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  const result = await api<{ token: string }>('/auth/select-property', {
    method: 'POST',
    body: JSON.stringify({ propertyId: property.id }),
  });
  await storeToken(result.token);
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function logout() {
  (await cookies()).delete(TOKEN_COOKIE);
  redirect('/login');
}

export async function saveMyProfile(fd: FormData) {
  let error: string | null = null;
  try {
    await api('/auth/me', {
      method: 'PATCH',
      body: JSON.stringify({
        fullName: String(fd.get('fullName') ?? '').trim(),
        phone: String(fd.get('phone') ?? '').trim(),
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/', 'layout');
  revalidatePath('/profile');
  redirect('/profile?' + (error ? `error=${encodeURIComponent(error)}` : `ok=${encodeURIComponent('Profile updated')}`));
}

export async function requestEmailChange(fd: FormData) {
  let error: string | null = null;
  try {
    await api('/auth/me/email-change', {
      method: 'POST',
      body: JSON.stringify({
        newEmail: String(fd.get('newEmail') ?? '').trim(),
        currentPassword: String(fd.get('currentPassword') ?? ''),
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/profile');
  redirect('/profile?' + (error ? `error=${encodeURIComponent(error)}` : `ok=${encodeURIComponent('Verification email sent. Your current sign-in email remains active until you verify the new address.')}`));
}

export async function changeMyPassword(fd: FormData) {
  let error: string | null = null;
  try {
    await api('/auth/me/password', {
      method: 'PATCH',
      body: JSON.stringify({
        currentPassword: String(fd.get('currentPassword') ?? ''),
        newPassword: String(fd.get('newPassword') ?? ''),
        confirmPassword: String(fd.get('confirmPassword') ?? ''),
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  if (error) redirect('/profile?' + `error=${encodeURIComponent(error)}`);
  (await cookies()).delete(TOKEN_COOKIE);
  redirect('/login?ok=' + encodeURIComponent('Password changed. Sign in again with your new password.'));
}
