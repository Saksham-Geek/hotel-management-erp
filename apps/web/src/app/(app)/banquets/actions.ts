'use server';

import { revalidatePath } from 'next/cache';
import { api, errorMessage } from '@/lib/api';

export async function createVenueAction(input: {
  name: string;
  type: string;
  maxPax: number;
  baseRentalRate: number;
  amenities?: string[];
}) {
  try {
    const res = await api<any>('/hotel/banquets/venues', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/banquets');
    revalidatePath('/settings');
    return { ok: true, venue: res.venue };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateVenueAction(
  id: string,
  input: {
    name?: string;
    type?: string;
    maxPax?: number;
    baseRentalRate?: number;
    amenities?: string[];
    isActive?: boolean;
  },
) {
  try {
    const res = await api<any>(`/hotel/banquets/venues/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    revalidatePath('/banquets');
    revalidatePath('/settings');
    return { ok: true, venue: res.venue };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function deleteVenueAction(id: string) {
  try {
    const res = await api<any>(`/hotel/banquets/venues/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/banquets');
    revalidatePath('/settings');
    return { ok: true, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function createBanquetBookingAction(input: {
  venueId: string;
  eventName: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  eventDate: string;
  slot: 'MORNING' | 'EVENING' | 'FULL_DAY';
  paxCount: number;
  menuPackage: string;
  ratePerPax: number;
  hallRental?: number;
  decorAvCharges?: number;
  advancePaid?: number;
  status?: string;
  specialInstructions?: string;
}) {
  try {
    const res = await api<any>('/hotel/banquets/bookings', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/banquets');
    return { ok: true, booking: res.booking, message: res.message };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function updateBanquetBookingAction(
  id: string,
  input: {
    status?: string;
    advancePaid?: number;
    specialInstructions?: string;
  },
) {
  try {
    const res = await api<any>(`/hotel/banquets/bookings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
    revalidatePath('/banquets');
    return { ok: true, booking: res.booking };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export async function getFunctionProspectusAction(id: string) {
  try {
    const res = await api<any>(`/hotel/banquets/bookings/${id}/fp`);
    return { ok: true, data: res };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}
