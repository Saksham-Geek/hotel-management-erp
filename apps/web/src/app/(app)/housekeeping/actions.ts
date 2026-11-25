'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, errorMessage } from '@/lib/api';

export async function turnaroundRoomAction(fd: FormData) {
  let error: string | null = null;
  const roomId = String(fd.get('roomId') ?? '');
  const toStatus = String(fd.get('toStatus') ?? '');
  const attendantName = String(fd.get('attendantName') ?? '').trim();
  const inspectionNotes = String(fd.get('inspectionNotes') ?? '').trim();
  const maintenanceIssue = String(fd.get('maintenanceIssue') ?? '').trim();

  try {
    await api('/hotel/rooms/housekeeping/turnaround', {
      method: 'POST',
      body: JSON.stringify({ roomId, toStatus, attendantName, inspectionNotes, maintenanceIssue }),
    });
  } catch (e) {
    error = errorMessage(e);
  }

  revalidatePath('/housekeeping');
  revalidatePath('/rooms');
  revalidatePath('/settings');
  if (error) {
    redirect(`/housekeeping?error=${encodeURIComponent(error)}`);
  }
  redirect(`/housekeeping?ok=${encodeURIComponent(
    toStatus === 'available'
      ? 'Room inspected and marked clean & ready'
      : toStatus === 'maintenance'
      ? 'Room flagged for maintenance repair'
      : 'Housekeeping status updated'
  )}`);
}

export async function postMinibarChargeHousekeepingAction(fd: FormData) {
  let error: string | null = null;
  const roomId = String(fd.get('roomId') ?? '');
  const minibarItemId = String(fd.get('minibarItemId') ?? '');
  const quantity = Number(fd.get('quantity') ?? 1);

  try {
    await api('/hotel/rooms/minibar/post-charge', {
      method: 'POST',
      body: JSON.stringify({ roomId, minibarItemId, quantity }),
    });
  } catch (e) {
    error = errorMessage(e);
  }

  revalidatePath('/housekeeping');
  revalidatePath('/billing');
  if (error) {
    redirect(`/housekeeping?error=${encodeURIComponent(error)}`);
  }
  redirect('/housekeeping?ok=Minibar+consumption+posted+directly+to+guest+folio');
}

export async function createLostAndFoundAction(fd: FormData) {
  let error: string | null = null;
  const roomNumber = String(fd.get('roomNumber') ?? '').trim();
  const itemName = String(fd.get('itemName') ?? '').trim();
  const category = String(fd.get('category') ?? 'electronics');
  const description = String(fd.get('description') ?? '').trim();
  const storageLocation = String(fd.get('storageLocation') ?? 'Housekeeping Locker A').trim();
  const finderName = String(fd.get('finderName') ?? 'Floor Attendant').trim();

  try {
    await api('/hotel/rooms/housekeeping/lost-and-found', {
      method: 'POST',
      body: JSON.stringify({ roomNumber, itemName, category, description, storageLocation, finderName }),
    });
  } catch (e) {
    error = errorMessage(e);
  }

  revalidatePath('/housekeeping');
  redirect(`/housekeeping?tab=lost_found&${error ? `error=${encodeURIComponent(error)}` : 'ok=Lost+item+logged+in+register'}`);
}

export async function claimLostAndFoundAction(fd: FormData) {
  let error: string | null = null;
  const id = String(fd.get('id') ?? '');
  const guestName = String(fd.get('guestName') ?? '').trim();
  const guestContact = String(fd.get('guestContact') ?? '').trim();

  try {
    await api(`/hotel/rooms/housekeeping/lost-and-found/${id}/claim`, {
      method: 'POST',
      body: JSON.stringify({ guestName, guestContact }),
    });
  } catch (e) {
    error = errorMessage(e);
  }

  revalidatePath('/housekeeping');
  redirect(`/housekeeping?tab=lost_found&${error ? `error=${encodeURIComponent(error)}` : 'ok=Item+marked+as+claimed'}`);
}

export async function toggleRoomDndAction(fd: FormData) {
  let error: string | null = null;
  const roomId = String(fd.get('roomId') ?? '');

  try {
    await api(`/hotel/rooms/${roomId}/toggle-dnd`, {
      method: 'POST',
    });
  } catch (e) {
    error = errorMessage(e);
  }

  revalidatePath('/housekeeping');
  revalidatePath('/rooms');
  revalidatePath('/dashboard');
  redirect(`/housekeeping?${error ? `error=${encodeURIComponent(error)}` : 'ok=Room+DND+status+toggled'}`);
}
