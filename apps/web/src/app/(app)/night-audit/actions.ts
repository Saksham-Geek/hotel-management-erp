'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';

export async function runNightAudit() {
  let okMessage = '';
  try {
    const res = await api<{ message: string; newBusinessDate: string }>('/hotel/night-audit/execute', {
      method: 'POST',
    });
    okMessage = res.message;
  } catch (err) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    const message = err instanceof Error ? err.message : 'Night audit execution failed';
    redirect(`/night-audit?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/night-audit');
  revalidatePath('/dashboard');
  redirect(`/night-audit?ok=${encodeURIComponent(okMessage)}`);
}
