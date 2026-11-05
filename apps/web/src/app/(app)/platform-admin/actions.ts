'use server';

import { revalidatePath } from 'next/cache';
import { api, errorMessage } from '@/lib/api';

export async function onboardHotelAction(fd: FormData) {
  try {
    const name = String(fd.get('name') ?? '').trim();
    const slug = String(fd.get('slug') ?? '').trim().toLowerCase();
    const contactEmail = String(fd.get('contactEmail') ?? '').trim();
    const contactPhone = String(fd.get('contactPhone') ?? '').trim();
    const planKey = String(fd.get('planKey') ?? 'growth').trim();
    const ownerName = String(fd.get('ownerName') ?? '').trim();
    const ownerPassword = String(fd.get('ownerPassword') ?? 'OwnerPass123!').trim();
    const initialFloors = parseInt(String(fd.get('initialFloors') ?? '3'), 10);
    const roomsPerFloor = parseInt(String(fd.get('roomsPerFloor') ?? '4'), 10);
    const seedInitialRooms = fd.get('seedInitialRooms') === 'true';

    await api('/platform/onboard-hotel', {
      method: 'POST',
      body: JSON.stringify({
        name,
        slug,
        contactEmail,
        contactPhone,
        planKey,
        ownerName,
        ownerPassword,
        initialFloors,
        roomsPerFloor,
        seedInitialRooms,
      }),
    });

    revalidatePath('/platform-admin');
    return { ok: `Successfully onboarded '${name}'! Initial clean rooms created and active in MRR.` };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function updateTenantStatusAction(tenantId: string, status: 'active' | 'suspended', churnReason?: string) {
  try {
    await api(`/platform/tenants/${tenantId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, churnReason }),
    });
    revalidatePath('/platform-admin');
    return { ok: `Updated status to ${status}` };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function updateTenantPlanAction(tenantId: string, planKey: 'starter' | 'growth' | 'enterprise') {
  try {
    await api(`/platform/tenants/${tenantId}/plan`, {
      method: 'PATCH',
      body: JSON.stringify({ planKey }),
    });
    revalidatePath('/platform-admin');
    return { ok: `Updated subscription plan to ${planKey.toUpperCase()}` };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}
