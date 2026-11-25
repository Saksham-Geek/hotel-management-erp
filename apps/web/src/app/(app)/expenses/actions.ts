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

// Category Actions
export async function createCategoryAction(input: {
  name: string;
  code?: string;
  icon?: string;
  badgeColor?: string;
  description?: string;
}) {
  try {
    const res = await api<any>('/hotel/expenses/categories', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/expenses');
    revalidatePath('/settings');
    return { ok: true, category: res.category, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    const res = await api<any>(`/hotel/expenses/categories/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/expenses');
    revalidatePath('/settings');
    return { ok: true, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// Vendor Actions
export async function createVendorAction(input: {
  name: string;
  category?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  panNumber?: string;
  address?: string;
  paymentTerms?: string;
}) {
  try {
    const res = await api<any>('/hotel/expenses/vendors', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/expenses');
    revalidatePath('/settings');
    return { ok: true, vendor: res.vendor, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateVendorAction(
  id: string,
  input: {
    name?: string;
    category?: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    gstin?: string;
    paymentTerms?: string;
    isActive?: boolean;
  },
) {
  try {
    const res = await api<any>(`/hotel/expenses/vendors/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    revalidatePath('/expenses');
    revalidatePath('/settings');
    return { ok: true, vendor: res.vendor };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteVendorAction(id: string) {
  try {
    const res = await api<any>(`/hotel/expenses/vendors/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/expenses');
    revalidatePath('/settings');
    return { ok: true, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// Concierge Settings Actions
export async function updateConciergeSettingsAction(input: {
  wifiSsid: string;
  wifiPassword: string;
  receptionPhone: string;
  receptionWhatsapp: string;
  breakfastTiming?: string;
  poolTiming?: string;
  gymTiming?: string;
  googleReviewUrl?: string;
}) {
  try {
    const res = await api<any>('/hotel/expenses/concierge-settings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/settings');
    revalidatePath('/guest-portal');
    return { ok: true, settings: res.settings, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

// Common Expense Items Actions
export async function createCommonExpenseAction(input: {
  name: string;
  categoryCode: string;
  defaultAmount?: number;
  defaultVendorName?: string;
  defaultPaymentMode?: string;
  description?: string;
}) {
  try {
    const res = await api<any>('/hotel/expenses/common-items', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/expenses');
    revalidatePath('/settings');
    return { ok: true, item: res.item, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteCommonExpenseAction(id: string) {
  try {
    const res = await api<any>(`/hotel/expenses/common-items/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/expenses');
    revalidatePath('/settings');
    return { ok: true, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
