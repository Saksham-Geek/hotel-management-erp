'use server';

import { API_URL } from '@/lib/api';

export async function createDirectBookingAction(payload: {
  tenantSlug: string;
  propertyId: string;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  specialRequests?: string;
}) {
  try {
    const res = await fetch(`${API_URL}/public/direct-booking`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, error: body?.message ?? 'Failed to complete direct booking' };
    }
    return { ok: true, data: body };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Booking service unreachable' };
  }
}
