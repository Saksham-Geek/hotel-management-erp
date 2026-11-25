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
