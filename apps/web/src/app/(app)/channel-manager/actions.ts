'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, errorMessage } from '@/lib/api';

export async function saveChannelConnection(fd: FormData) {
  let errRedirect: string | null = null;
  const channelKey = String(fd.get('channelKey') ?? '').trim();
  const channelName = String(fd.get('channelName') ?? '').trim();
  const hotelCode = String(fd.get('hotelCode') ?? '').trim();
  const apiKey = String(fd.get('apiKey') ?? '').trim();
  const apiSecret = String(fd.get('apiSecret') ?? '').trim();
  const commissionRate = Number(fd.get('commissionRate') ?? 15);
  const syncMode = String(fd.get('syncMode') ?? 'two_way').trim();
  const isActive = fd.get('isActive') === 'on' || fd.get('isActive') === 'true';

  try {
    const res = await api<{ ok: boolean; message: string }>(`/hotel/channels/${channelKey}`, {
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
    revalidatePath('/channel-manager');
    revalidatePath('/tape-chart');
    return redirect(`/channel-manager?ok=${encodeURIComponent(res.message || 'Channel configured successfully')}`);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    errRedirect = errorMessage(err);
  }

  if (errRedirect) {
    redirect(`/channel-manager?error=${encodeURIComponent(errRedirect)}`);
  }
}

export async function syncChannel(fd: FormData) {
  let errRedirect: string | null = null;
  const channelKey = String(fd.get('channelKey') ?? '').trim();

  try {
    const res = await api<{ ok: boolean; summary: string }>(`/hotel/channels/${channelKey}/sync`, {
      method: 'POST',
    });
    revalidatePath('/channel-manager');
    revalidatePath('/tape-chart');
    return redirect(`/channel-manager?ok=${encodeURIComponent(res.summary || 'Inventory synchronized successfully')}`);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    errRedirect = errorMessage(err);
  }

  if (errRedirect) {
    redirect(`/channel-manager?error=${encodeURIComponent(errRedirect)}`);
  }
}

export async function simulateOtaBooking(fd: FormData) {
  let errRedirect: string | null = null;
  const channelKey = String(fd.get('channelKey') ?? 'makemytrip').trim();
  const guestName = String(fd.get('guestName') ?? '').trim();
  const guestPhone = String(fd.get('guestPhone') ?? '').trim();
  const checkIn = String(fd.get('checkIn') ?? '').trim();
  const checkOut = String(fd.get('checkOut') ?? '').trim();
  const totalAmount = Number(fd.get('totalAmount') ?? 5000);
  const commissionRate = Number(fd.get('commissionRate') ?? 18);
  const roomTypeId = String(fd.get('roomTypeId') ?? '').trim() || undefined;

  try {
    const res = await api<{
      ok: boolean;
      otaBookingId: string;
      reservationId: string;
      roomNumber: string;
      message: string;
    }>('/hotel/channels/simulate-booking', {
      method: 'POST',
      body: JSON.stringify({
        channelKey,
        guestName,
        guestPhone,
        checkIn,
        checkOut,
        totalAmount,
        commissionRate,
        roomTypeId,
      }),
    });
    revalidatePath('/channel-manager');
    revalidatePath('/tape-chart');
    revalidatePath('/dashboard');
    revalidatePath('/reservations');
    revalidatePath('/billing');
    return redirect(`/channel-manager?ok=${encodeURIComponent(res.message)}`);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    errRedirect = errorMessage(err);
  }

  if (errRedirect) {
    redirect(`/channel-manager?error=${encodeURIComponent(errRedirect)}`);
  }
}
