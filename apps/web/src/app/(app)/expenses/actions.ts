'use server';

import { revalidatePath } from 'next/cache';
import { api, errorMessage } from '@/lib/api';

export async function createExpenseAction(input: {
  category: string;
  amount: number;
  paymentMode?: string;
  paidTo: string;
  invoiceRef?: string;
  notes?: string;
  receiptUrl?: string;
  expenseDate?: string;
}) {
  try {
    const res = await api<any>('/hotel/expenses', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/expenses');
    return { ok: true, voucher: res.voucher, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteExpenseAction(id: string) {
  try {
    const res = await api<any>(`/hotel/expenses/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/expenses');
    return { ok: true, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
