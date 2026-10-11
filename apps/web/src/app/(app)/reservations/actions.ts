
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, errorMessage } from '@/lib/api';

export async function searchGuestProfiles(q: string) {
  const term = q.trim();

  if (term.length < 2) {
    return [];
  }

  return api<
    {
      id: string;
      fullName: string;
      phone: string | null;
      email: string | null;
      vip: boolean;
    }[]
  >(`/hotel/guests?q=${encodeURIComponent(term)}`);
}

export async function createReservation(fd: FormData) {
  let error: string | null = null;

  try {
    const existingGuestId = String(fd.get('guestId') ?? '').trim();

    const guestIds = [
      ...new Set(
        fd
          .getAll('guestIds')
          .map(String)
          .map((id) => id.trim())
          .filter((id) => id && id !== existingGuestId),
      ),
    ];

    const savedCompanionsRaw = String(fd.get('newCompanions') ?? '[]');
    const draftCompanionRaw = String(fd.get('newCompanionDraft') ?? '');
    let newCompanions: unknown[];
    try {
      const saved = JSON.parse(savedCompanionsRaw);
      const draft = draftCompanionRaw ? JSON.parse(draftCompanionRaw) : null;
      if (!Array.isArray(saved) || (draft !== null && typeof draft !== 'object')) {
        throw new Error();
      }
      newCompanions = [...saved, ...(draft ? [draft] : [])];
    } catch {
      throw new Error('Companion details could not be read. Please check them and try again.');
    }

    if (newCompanions.length > 19) {
      throw new Error('A reservation can include up to 20 guests.');
    }

    const roomId = String(fd.get('roomId') ?? '').trim();
    const checkIn = String(fd.get('checkIn') ?? '').trim();
    const checkOut = String(fd.get('checkOut') ?? '').trim();
    const rateMode = String(fd.get('rateMode') ?? 'nightly');

    const checkInTime = String(
      fd.get('checkInTime') ?? '12:00',
    ).trim();

    const checkOutTime = String(
      fd.get('checkOutTime') ?? '11:00',
    ).trim();

    const unitRateOverrideRaw = String(
      fd.get('unitRateOverride') ?? '',
    ).trim();

    const overrideReason = String(
      fd.get('overrideReason') ?? '',
    ).trim();

    if (!roomId || !checkIn || !checkOut) {
      throw new Error('Select a room and both stay dates.');
    }

    if (!['nightly', 'hourly'].includes(rateMode)) {
      throw new Error('Select a valid rate mode.');
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkInTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkOutTime)
    ) {
      throw new Error('Enter valid check-in and check-out times.');
    }

    if (
      checkOut < checkIn ||
      (checkOut === checkIn &&
        (rateMode !== 'hourly' || checkOutTime <= checkInTime))
    ) {
      throw new Error(
        rateMode === 'hourly'
          ? 'Hourly check-out must be after check-in.'
          : 'Check-out date must be after check-in date.',
      );
    }

    const unitRateOverride = unitRateOverrideRaw === ''
      ? undefined
      : Number(unitRateOverrideRaw);

    if (unitRateOverride !== undefined &&
      (!Number.isFinite(unitRateOverride) || unitRateOverride < 0 || unitRateOverride > 10_000_000)) {
      throw new Error('Manual rate must be a valid amount between 0 and 10,000,000.');
    }

    if (unitRateOverride !== undefined && !overrideReason) {
      throw new Error(
        'Enter a reason for the manual rate, such as manager approval.',
      );
    }

    const newGuest = existingGuestId
      ? undefined
      : {
          fullName: String(
            fd.get('guestName') ?? '',
          ).trim(),
          phone:
            String(fd.get('guestPhone') ?? '').trim() ||
            undefined,
          email:
            String(fd.get('guestEmail') ?? '').trim() ||
            undefined,
        };

    if (!existingGuestId && !newGuest?.fullName) {
      throw new Error(
        'Select an existing guest or enter a new guest name.',
      );
    }

    await api('/hotel/reservations', {
      method: 'POST',
      body: JSON.stringify({
        ...(existingGuestId
          ? { guestId: existingGuestId }
          : { newGuest }),

        guestIds,
        newCompanions,
        roomId,
        checkIn,
        checkOut,
        rateMode,
        checkInTime,
        checkOutTime,

        ...(unitRateOverride !== undefined
          ? { unitRateOverride }
          : {}),

        ...(overrideReason
          ? { overrideReason }
          : {}),
      }),
    });
  } catch (e) {
    console.error('Reservation creation failed:', e);
    error = errorMessage(e);
  }

  revalidatePath('/reservations');
  revalidatePath('/dashboard');
  revalidatePath('/rooms');

  redirect(
    '/reservations?' +
      (error
        ? `error=${encodeURIComponent(error)}`
        : `ok=${encodeURIComponent(
            'Reservation and consolidated folio created',
          )}`),
  );
}

export async function changeReservation(fd: FormData) {
  let error: string | null = null;
  const action = String(fd.get('action') ?? '');
  const id = String(fd.get('id') ?? '');

  try {
    if (!id) {
      throw new Error('Reservation ID is missing.');
    }

    if (!['check-in', 'check-out', 'cancel'].includes(action)) {
      throw new Error('Invalid reservation action.');
    }

    await api(`/hotel/reservations/${id}/${action}`, {
      method: 'POST',
    });
  } catch (e) {
    console.error('Reservation status change failed:', e);
    error = errorMessage(e);
  }

  revalidatePath('/reservations');
  revalidatePath('/dashboard');
  revalidatePath('/rooms');
  revalidatePath('/housekeeping');

  const done: Record<string, string> = {
    'check-in': 'Guest checked in',
    'check-out': 'Guest checked out',
    cancel: 'Reservation cancelled',
  };

  redirect(
    '/reservations?' +
      (error
        ? `error=${encodeURIComponent(error)}`
        : `ok=${encodeURIComponent(
            done[action] ?? 'Reservation updated',
          )}`),
  );
}
