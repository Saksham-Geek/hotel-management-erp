'use server';

import { redirect } from 'next/navigation';
import { API_URL } from '@/lib/api';

export async function verifyEmailChange(fd: FormData) {
  const token = String(fd.get('token') ?? '');
  try {
    const response = await fetch(`${API_URL}/auth/verify-email-change`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ token }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof result?.message === 'string' ? result.message : 'This verification link could not be used.';
      redirect('/verify-email?error=' + encodeURIComponent(message));
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error) throw error;
    redirect('/verify-email?error=' + encodeURIComponent('Could not reach the server. Try again in a moment.'));
  }
  redirect('/login?ok=' + encodeURIComponent('Email verified. Sign in with your new email address.'));
}
