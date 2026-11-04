'use server';

import { revalidatePath } from 'next/cache';
import { api, errorMessage } from '@/lib/api';

export async function switchPlanAction(formData: FormData) {
  const planKey = formData.get('planKey') as string;
  if (!planKey) {
    return { error: 'Please choose a plan to switch to.' };
  }

  try {
    await api('/entitlements/switch-plan', {
      method: 'POST',
      body: JSON.stringify({ planKey }),
    });

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    return { error: errorMessage(err) };
  }
}
