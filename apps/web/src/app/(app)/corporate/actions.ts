'use server';

import { revalidatePath } from 'next/cache';
import { api, errorMessage } from '@/lib/api';
import type { CreateCorporateAccountInput } from '@erp/shared';

export async function createCorporateAccountAction(input: CreateCorporateAccountInput) {
  try {
    const res = await api<any>('/hotel/billing/corporate-accounts', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/corporate');
    return { ok: true, account: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
