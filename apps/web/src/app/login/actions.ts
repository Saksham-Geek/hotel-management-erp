'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { API_URL, api, TOKEN_COOKIE } from '@/lib/api';

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
  } catch {
    /* API unreachable: keep the default message */
  }
  if (!token) redirect('/login?error=' + encodeURIComponent(error));

  await storeToken(token);
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
