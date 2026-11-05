'use server';

import { revalidatePath } from 'next/cache';
import { api, errorMessage } from '@/lib/api';
import type {
  CreateKotOrderInput,
  UpdateKotStatusInput,
  ChargeKotToRoomInput,
} from '@erp/shared';

export async function createKotOrderAction(input: CreateKotOrderInput) {
  try {
    const res = await api<any>('/hotel/restaurant/kots', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/restaurant');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateKotStatusAction(id: string, status: UpdateKotStatusInput['status']) {
  try {
    const res = await api<any>(`/hotel/restaurant/kots/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    revalidatePath('/restaurant');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function chargeKotToRoomAction(id: string, input: ChargeKotToRoomInput) {
  try {
    const res = await api<any>(`/hotel/restaurant/kots/${id}/charge-to-room`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/restaurant');
    revalidatePath('/billing');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function settleKotDirectAction(id: string) {
  try {
    const res = await api<any>(`/hotel/restaurant/kots/${id}/settle-direct`, {
      method: 'POST',
    });
    revalidatePath('/restaurant');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
