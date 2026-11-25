'use server';

import { revalidatePath } from 'next/cache';
import { api, errorMessage } from '@/lib/api';

export async function createRawMaterialAction(input: {
  name: string;
  category?: string;
  unit?: string;
  currentStock?: number;
  minimumAlertStock?: number;
  costPerUnit?: number;
}) {
  try {
    const res = await api<any>('/hotel/restaurant/inventory/raw-materials', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/inventory');
    return { ok: true, item: res.item, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function restockRawMaterialAction(
  id: string,
  input: {
    quantity: number;
    costPerUnit?: number;
    notes?: string;
  },
) {
  try {
    const res = await api<any>(`/hotel/restaurant/inventory/raw-materials/${id}/restock`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/inventory');
    return { ok: true, item: res.item, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
