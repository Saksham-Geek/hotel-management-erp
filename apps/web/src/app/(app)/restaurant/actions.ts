'use server';

import { revalidatePath } from 'next/cache';
import { api, errorMessage } from '@/lib/api';
import type {
  CreateKotOrderInput,
  UpdateKotStatusInput,
  ChargeKotToRoomInput,
  PunchKotRoundInput,
  MergeTablesInput,
  TransferTableInput,
  AdjustKotBillInput,
  SplitKotBillInput,
  SettleKotSplitInput,
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

export async function punchKotRoundAction(id: string, input: PunchKotRoundInput) {
  try {
    const res = await api<any>(`/hotel/restaurant/kots/${id}/round`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/restaurant');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function mergeTablesAction(input: MergeTablesInput) {
  try {
    const res = await api<any>('/hotel/restaurant/tables/merge', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/restaurant');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function transferTableAction(input: TransferTableInput) {
  try {
    const res = await api<any>('/hotel/restaurant/tables/transfer', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/restaurant');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function adjustKotBillAction(id: string, input: AdjustKotBillInput) {
  try {
    const res = await api<any>(`/hotel/restaurant/kots/${id}/bill-adjust`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    revalidatePath('/restaurant');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function splitKotBillAction(id: string, input: SplitKotBillInput) {
  try {
    const res = await api<any>(`/hotel/restaurant/kots/${id}/split`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/restaurant');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function settleKotSplitAction(orderId: string, splitId: string, input: SettleKotSplitInput) {
  try {
    const res = await api<any>(`/hotel/restaurant/kots/${orderId}/splits/${splitId}/settle`, {
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

export async function lookupCustomerAction(phone: string) {
  try {
    const res = await api<any>(`/hotel/restaurant/customers/lookup?phone=${encodeURIComponent(phone)}`);
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

export async function settleKotDirectAction(
  id: string,
  paymentMethod = 'cash',
  customerPhone?: string,
  customerName?: string
) {
  try {
    const res = await api<any>(`/hotel/restaurant/kots/${id}/settle-direct`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod, customerPhone, customerName }),
    });
    revalidatePath('/restaurant');
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
