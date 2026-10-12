'use server';

import { redirect } from 'next/navigation';
import { API_URL } from '@/lib/api';

export async function completePasswordReset(fd: FormData) {
  let error: string | null = null;
  try {
    const response = await fetch(`${API_URL}/auth/password-reset`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({
        token: String(fd.get('token') ?? ''),
        newPassword: String(fd.get('newPassword') ?? ''),
        confirmPassword: String(fd.get('confirmPassword') ?? ''),
      }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      error = typeof body?.message === 'string' ? body.message : 'This reset link could not be used.';
    }
  } catch {
    error = 'Could not reach the server. Try again in a moment.';
  }
  if (error) redirect('/reset-password?error=' + encodeURIComponent(error));
  redirect('/login?ok=' + encodeURIComponent('Password reset. Sign in with your new password.'));
}
