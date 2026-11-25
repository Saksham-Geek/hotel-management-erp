'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, errorMessage } from '@/lib/api';

// --- Rooms Actions ---

export async function createRoomTypeSetting(fd: FormData) {
  let error: string | null = null;
  try {
    await api('/hotel/room-types', {
      method: 'POST',
      body: JSON.stringify({
        name: fd.get('name'),
        baseRate: fd.get('baseRate'),
        hourlyRate: fd.get('hourlyRate') || undefined,
        capacity: fd.get('capacity') || 2,
        description: fd.get('description') || undefined,
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/rooms');
  revalidatePath('/dashboard');
  if (error) {
    redirect(`/settings?tab=rooms&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=rooms&ok=Room+type+created+successfully');
}

export async function createRoomSetting(fd: FormData) {
  let error: string | null = null;
  try {
    await api('/hotel/rooms', {
      method: 'POST',
      body: JSON.stringify({
        roomTypeId: fd.get('roomTypeId'),
        number: fd.get('number'),
        floor: fd.get('floor') || 0,
        baseRate: fd.get('baseRate') || undefined,
        hourlyRate: fd.get('hourlyRate') || undefined,
        lockType: fd.get('lockType') || 'both',
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/rooms');
  revalidatePath('/dashboard');
  if (error) {
    redirect(`/settings?tab=rooms&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=rooms&ok=Room+created+successfully');
}

export async function updateRoomTypeSetting(fd: FormData) {
  let error: string | null = null;
  const hourlyRate = String(fd.get('hourlyRate') ?? '').trim();
  const description = String(fd.get('description') ?? '').trim();
  try {
    await api(`/hotel/room-types/${fd.get('id')}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: fd.get('name'),
        baseRate: Number(fd.get('baseRate')),
        hourlyRate: hourlyRate === '' ? null : Number(hourlyRate),
        capacity: Number(fd.get('capacity')),
        description: description || null,
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/rooms');
  if (error) {
    redirect(`/settings?tab=rooms&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=rooms&ok=Room+type+updated+successfully');
}

// --- Bank UPI Settings ---

export async function updateUpiSetting(fd: FormData) {
  const upiId = String(fd.get('upiId') ?? '').trim().toLowerCase();
  const upiMerchantName = String(fd.get('upiMerchantName') ?? '').trim() || undefined;
  let error: string | null = null;
  try {
    await api('/hotel/upi-settings', {
      method: 'PATCH',
      body: JSON.stringify({ upiId, upiMerchantName }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/billing');
  if (error) {
    redirect(`/settings?tab=payments&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=payments&ok=Receiver+UPI+ID+updated+successfully');
}

// --- Key Access Policy & Lock System Settings ---

export async function updateKeySystemSetting(fd: FormData) {
  const keySystemMode = String(fd.get('keySystemMode') ?? 'hybrid');
  const enableMobileQr = fd.get('enableMobileQr') === 'on';
  let error: string | null = null;
  try {
    await api('/hotel/keycards/settings', {
      method: 'PATCH',
      body: JSON.stringify({ keySystemMode, enableMobileQr }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/keycards');
  if (error) {
    redirect(`/settings?tab=keycards&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=keycards&ok=Key+access+policy+and+lock+settings+updated+successfully');
}

// --- POS Terminals Settings ---

export async function createPosTerminalSetting(fd: FormData) {
  const name = String(fd.get('name') ?? '').trim();
  const terminalId = String(fd.get('terminalId') ?? '').trim();
  const merchantId = String(fd.get('merchantId') ?? '').trim() || undefined;
  const provider = String(fd.get('provider') ?? 'pine_labs');
  const connectionType = String(fd.get('connectionType') ?? 'cloud_lan');
  const ipAddress = String(fd.get('ipAddress') ?? '').trim() || undefined;
  const port = parseInt(String(fd.get('port') ?? '8080'), 10) || 8080;
  const isDefault = fd.get('isDefault') === 'on';

  let error: string | null = null;
  try {
    await api('/hotel/pos/terminals', {
      method: 'POST',
      body: JSON.stringify({
        name,
        terminalId,
        merchantId,
        provider,
        connectionType,
        ipAddress,
        port,
        isDefault,
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/billing');
  if (error) {
    redirect(`/settings?tab=payments&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=payments&ok=POS+machine+registered+successfully');
}

// --- Channel Manager Settings ---

export async function saveChannelConnectionSetting(fd: FormData) {
  const channelKey = String(fd.get('channelKey') ?? '').trim();
  const channelName = String(fd.get('channelName') ?? '').trim();
  const hotelCode = String(fd.get('hotelCode') ?? '').trim();
  const apiKey = String(fd.get('apiKey') ?? '').trim();
  const apiSecret = String(fd.get('apiSecret') ?? '').trim();
  const commissionRate = Number(fd.get('commissionRate') ?? 15);
  const syncMode = String(fd.get('syncMode') ?? 'two_way').trim();
  const isActive = fd.get('isActive') === 'on' || fd.get('isActive') === 'true';

  let error: string | null = null;
  try {
    await api(`/hotel/channels/${channelKey}`, {
      method: 'POST',
      body: JSON.stringify({
        channelKey,
        channelName,
        hotelCode,
        apiKey: apiKey || undefined,
        apiSecret: apiSecret || undefined,
        commissionRate,
        syncMode,
        isActive,
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/channel-manager');
  revalidatePath('/tape-chart');
  if (error) {
    redirect(`/settings?tab=channels&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=channels&ok=OTA+channel+connection+saved+successfully');
}

// --- Staff Member Onboarding ---

export async function onboardStaffSetting(fd: FormData) {
  const email = fd.get('email')?.toString().trim();
  const fullName = fd.get('fullName')?.toString().trim();
  const role = fd.get('role')?.toString().trim();
  const department = fd.get('department')?.toString().trim();
  const shift = fd.get('shift')?.toString().trim();
  const password = fd.get('password')?.toString().trim() || 'HotelStaff123!';

  if (!email || !fullName || !role) {
    redirect('/settings?tab=staff&error=Email%2C+Full+Name%2C+and+Role+are+required.');
  }

  let error: string | null = null;
  try {
    await api('/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        fullName,
        role,
        department: department || 'Front Office',
        shift: shift || 'General',
        password,
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/staff');
  if (error) {
    redirect(`/settings?tab=staff&error=${encodeURIComponent(error)}`);
  }
  redirect(`/settings?tab=staff&ok=Onboarded+${encodeURIComponent(fullName)}+successfully`);
}

// --- Petty Cash Categories & Vendors Actions ---

export async function createExpenseCategorySetting(fd: FormData) {
  let error: string | null = null;
  const name = String(fd.get('name') ?? '').trim();
  const icon = String(fd.get('icon') ?? '📦').trim();
  const description = String(fd.get('description') ?? '').trim();
  try {
    await api('/hotel/expenses/categories', {
      method: 'POST',
      body: JSON.stringify({ name, icon, description: description || undefined }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/expenses');
  if (error) {
    redirect(`/settings?tab=expenses&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=expenses&ok=Expense+category+created+successfully');
}

export async function deleteExpenseCategorySetting(id: string) {
  let error: string | null = null;
  try {
    await api(`/hotel/expenses/categories/${id}`, { method: 'DELETE' });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/expenses');
  if (error) {
    redirect(`/settings?tab=expenses&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=expenses&ok=Category+deleted+successfully');
}

export async function createVendorSetting(fd: FormData) {
  let error: string | null = null;
  const name = String(fd.get('name') ?? '').trim();
  const category = String(fd.get('category') ?? 'General Supplier').trim();
  const contactPerson = String(fd.get('contactPerson') ?? '').trim();
  const phone = String(fd.get('phone') ?? '').trim();
  const email = String(fd.get('email') ?? '').trim();
  const gstin = String(fd.get('gstin') ?? '').trim().toUpperCase();
  const panNumber = String(fd.get('panNumber') ?? '').trim().toUpperCase();
  const paymentTerms = String(fd.get('paymentTerms') ?? 'Cash on Delivery').trim();
  const address = String(fd.get('address') ?? '').trim();

  try {
    await api('/hotel/expenses/vendors', {
      method: 'POST',
      body: JSON.stringify({
        name,
        category,
        contactPerson: contactPerson || undefined,
        phone: phone || undefined,
        email: email || undefined,
        gstin: gstin || undefined,
        panNumber: panNumber || undefined,
        paymentTerms,
        address: address || undefined,
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/expenses');
  if (error) {
    redirect(`/settings?tab=expenses&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=expenses&ok=Vendor+registered+successfully');
}

export async function deleteVendorSetting(id: string) {
  let error: string | null = null;
  try {
    await api(`/hotel/expenses/vendors/${id}`, { method: 'DELETE' });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/expenses');
  if (error) {
    redirect(`/settings?tab=expenses&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=expenses&ok=Vendor+deactivated+successfully');
}

export async function createCommonExpenseSetting(fd: FormData) {
  let error: string | null = null;
  const name = String(fd.get('name') ?? '').trim();
  const categoryCode = String(fd.get('categoryCode') ?? '').trim();
  const defaultAmount = Number(fd.get('defaultAmount') ?? 0);
  const defaultVendorName = String(fd.get('defaultVendorName') ?? '').trim();
  const defaultPaymentMode = String(fd.get('defaultPaymentMode') ?? 'CASH_DRAWER').trim();
  const description = String(fd.get('description') ?? '').trim();

  if (!name || !categoryCode) {
    redirect('/settings?tab=expenses&error=Expense+item+name+and+category+are+required.');
  }

  try {
    await api('/hotel/expenses/common-items', {
      method: 'POST',
      body: JSON.stringify({
        name,
        categoryCode,
        defaultAmount,
        defaultVendorName: defaultVendorName || undefined,
        defaultPaymentMode,
        description: description || undefined,
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/expenses');
  if (error) {
    redirect(`/settings?tab=expenses&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=expenses&ok=Common+recurring+expense+item+saved+successfully');
}

export async function deleteCommonExpenseSetting(id: string) {
  let error: string | null = null;
  try {
    await api(`/hotel/expenses/common-items/${id}`, { method: 'DELETE' });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/expenses');
  if (error) {
    redirect(`/settings?tab=expenses&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=expenses&ok=Common+expense+item+removed');
}

// --- Banquet Venues Actions ---

export async function createVenueSetting(fd: FormData) {
  let error: string | null = null;
  const name = String(fd.get('name') ?? '').trim();
  const type = String(fd.get('type') ?? 'BANQUET_HALL').trim();
  const maxPax = Number(fd.get('maxPax') ?? 100);
  const baseRentalRate = Number(fd.get('baseRentalRate') ?? 0);
  const amenitiesStr = String(fd.get('amenities') ?? '').trim();
  const amenities = amenitiesStr ? amenitiesStr.split(',').map((s) => s.trim()) : [];

  try {
    await api('/hotel/banquets/venues', {
      method: 'POST',
      body: JSON.stringify({ name, type, maxPax, baseRentalRate, amenities }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/banquets');
  if (error) {
    redirect(`/settings?tab=banquets&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=banquets&ok=Banquet+venue+created+successfully');
}

export async function deleteVenueSetting(id: string) {
  let error: string | null = null;
  try {
    await api(`/hotel/banquets/venues/${id}`, { method: 'DELETE' });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/banquets');
  if (error) {
    redirect(`/settings?tab=banquets&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=banquets&ok=Venue+deactivated+successfully');
}

// --- Digital Concierge Actions ---

export async function updateConciergeSetting(fd: FormData) {
  let error: string | null = null;
  const wifiSsid = String(fd.get('wifiSsid') ?? '').trim();
  const wifiPassword = String(fd.get('wifiPassword') ?? '').trim();
  const receptionPhone = String(fd.get('receptionPhone') ?? '').trim();
  const receptionWhatsapp = String(fd.get('receptionWhatsapp') ?? '').trim();
  const breakfastTiming = String(fd.get('breakfastTiming') ?? '').trim();
  const poolTiming = String(fd.get('poolTiming') ?? '').trim();
  const gymTiming = String(fd.get('gymTiming') ?? '').trim();
  const googleReviewUrl = String(fd.get('googleReviewUrl') ?? '').trim();

  try {
    await api('/hotel/expenses/concierge-settings', {
      method: 'POST',
      body: JSON.stringify({
        wifiSsid,
        wifiPassword,
        receptionPhone,
        receptionWhatsapp,
        breakfastTiming: breakfastTiming || undefined,
        poolTiming: poolTiming || undefined,
        gymTiming: gymTiming || undefined,
        googleReviewUrl: googleReviewUrl || undefined,
      }),
    });
  } catch (e) {
    error = errorMessage(e);
  }
  revalidatePath('/settings');
  revalidatePath('/guest-portal');
  if (error) {
    redirect(`/settings?tab=concierge&error=${encodeURIComponent(error)}`);
  }
  redirect('/settings?tab=concierge&ok=In-Room+Concierge+configuration+saved+successfully');
}
