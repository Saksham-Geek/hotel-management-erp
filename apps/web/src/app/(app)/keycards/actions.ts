'use server';

import { revalidatePath } from 'next/cache';
import { api, errorMessage } from '@/lib/api';
import type {
  UpdateRoomKeyStatusInput,
  EncodeKeycardInput,
} from '@erp/shared';

export async function updateRoomKeyStatusAction(id: string, input: UpdateRoomKeyStatusInput) {
  try {
    const res = await api<any>(`/hotel/keycards/keys/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    revalidatePath('/keycards');
    revalidatePath('/reservations');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function encodeKeycardAction(id: string, input: EncodeKeycardInput) {
  try {
    const res = await api<any>(`/hotel/keycards/keys/${id}/encode`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/keycards');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function checkInReservationAction(reservationId: string) {
  try {
    const res = await api<any>(`/hotel/reservations/${reservationId}/check-in`, {
      method: 'POST',
    });
    revalidatePath('/keycards');
    revalidatePath('/reservations');
    revalidatePath('/dashboard');
    revalidatePath('/rooms');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
