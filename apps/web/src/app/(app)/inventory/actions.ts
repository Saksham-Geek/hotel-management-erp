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
  skuCode?: string;
  defaultVendorName?: string;
  storageLocation?: string;
}) {
  try {
    const res = await api<any>('/hotel/restaurant/inventory/raw-materials', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/inventory');
    revalidatePath('/settings');
    return { ok: true, item: res.item, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateRawMaterialAction(
  id: string,
  input: {
    name?: string;
    category?: string;
    unit?: string;
    currentStock?: number;
    minimumAlertStock?: number;
    costPerUnit?: number;
    skuCode?: string;
    defaultVendorName?: string;
    storageLocation?: string;
  },
) {
  try {
    const res = await api<any>(`/hotel/restaurant/inventory/raw-materials/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    revalidatePath('/inventory');
    revalidatePath('/settings');
    return { ok: true, item: res.item, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteRawMaterialAction(id: string) {
  try {
    const res = await api<any>(`/hotel/restaurant/inventory/raw-materials/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/inventory');
    revalidatePath('/settings');
    return { ok: true, message: res.message };
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
    revalidatePath('/settings');
    return { ok: true, item: res.item, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function adjustRawMaterialAction(
  id: string,
  input: {
    quantity: number;
    movementType: 'CONSUMPTION' | 'WASTAGE' | 'AUDIT_ADJUSTMENT';
    department?: string;
    notes?: string;
  },
) {
  try {
    const res = await api<any>(`/hotel/restaurant/inventory/raw-materials/${id}/adjust`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/inventory');
    revalidatePath('/settings');
    return { ok: true, item: res.item, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function createInventoryCategoryAction(input: {
  name: string;
  code?: string;
  icon?: string;
  description?: string;
}) {
  try {
    const res = await api<any>('/hotel/restaurant/inventory/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/inventory');
    revalidatePath('/settings');
    return { ok: true, category: res.category, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteInventoryCategoryAction(id: string) {
  try {
    const res = await api<any>(`/hotel/restaurant/inventory/categories/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/inventory');
    revalidatePath('/settings');
    return { ok: true, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function getStockMovementsAction() {
  try {
    const res = await api<any[]>('/hotel/restaurant/inventory/movements');
    return { ok: true, movements: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err), movements: [] };
  }
}

export async function configureDishRecipeAction(input: {
  menuItemId: string;
  ingredients: Array<{ rawMaterialId: string; quantityPerPortion: number }>;
}) {
  try {
    const res = await api<any>('/hotel/restaurant/inventory/recipes', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/inventory');
    revalidatePath('/restaurant');
    revalidatePath('/settings');
    return { ok: true, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
