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
