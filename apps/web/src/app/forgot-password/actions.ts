'use server';

import { redirect } from 'next/navigation';
import { API_URL } from '@/lib/api';

export async function sendPasswordReset(fd: FormData) {
  let error: string | null = null;
  try {
    const response = await fetch(`${API_URL}/auth/password-reset-request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        tenant: String(fd.get('tenant') ?? '').trim(),
        email: String(fd.get('email') ?? '').trim(),
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      error = typeof body?.message === 'string' ? body.message : 'Could not request a reset link. Try again.';
    }
  } catch {
    error = 'Could not reach the server. Try again in a moment.';
  }
  redirect('/forgot-password?' + (error ? `error=${encodeURIComponent(error)}` : 'sent=1'));
}
