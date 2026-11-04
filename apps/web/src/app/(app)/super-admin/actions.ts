'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { api, errorMessage, TOKEN_COOKIE } from '@/lib/api';

async function storeToken(token: string) {
  (await cookies()).set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 8,
  });
}

export async function createHotel(fd: FormData) {
  const name = String(fd.get('name') ?? '').trim();
  const timezone = String(fd.get('timezone') ?? 'Asia/Kolkata').trim();
  const currency = String(fd.get('currency') ?? 'INR').trim();
  const planKey = String(fd.get('planKey') ?? 'growth').trim();
  const seedRooms = fd.get('seedRooms') === 'on' || fd.get('seedRooms') === 'true';
  const initialFloors = parseInt(String(fd.get('initialFloors') ?? '3'), 10);
  const roomsPerFloor = parseInt(String(fd.get('roomsPerFloor') ?? '4'), 10);

  const managerName = String(fd.get('managerName') ?? '').trim();
  const managerEmail = String(fd.get('managerEmail') ?? '').trim();
  const managerPassword = String(fd.get('managerPassword') ?? '').trim();

  let manager = undefined;
  if (managerEmail && managerName) {
    manager = {
      fullName: managerName,
      email: managerEmail,
      password: managerPassword || 'HotelStaff123!',
    };
  }

  let error = '';
  try {
    await api('/super-admin/properties', {
      method: 'POST',
      body: JSON.stringify({
        name,
        timezone,
        currency,
        planKey,
        manager,
        seedRooms,
        initialFloors,
        roomsPerFloor,
      }),
    });
  } catch (err) {
    error = errorMessage(err);
  }

  if (error) {
    redirect('/super-admin?error=' + encodeURIComponent(error));
  }

  revalidatePath('/super-admin');
  revalidatePath('/', 'layout');
  redirect('/super-admin?ok=' + encodeURIComponent(`Hotel property "${name}" successfully onboarded!`));
}

export async function assignStaff(fd: FormData) {
  const propertyId = String(fd.get('propertyId') ?? '').trim();
  const email = String(fd.get('email') ?? '').trim();
  const fullName = String(fd.get('fullName') ?? '').trim();
  const role = String(fd.get('role') ?? 'manager').trim();
  const password = String(fd.get('password') ?? '').trim();
  const userId = String(fd.get('userId') ?? '').trim();

  let error = '';
  try {
    await api(`/super-admin/properties/${propertyId}/assign-staff`, {
      method: 'POST',
      body: JSON.stringify({
        propertyId,
        userId: userId || undefined,
        email,
        fullName: fullName || undefined,
        role,
        password: password || undefined,
      }),
    });
  } catch (err) {
    error = errorMessage(err);
  }

  if (error) {
    redirect('/super-admin?error=' + encodeURIComponent(error));
  }

  revalidatePath('/super-admin');
  redirect('/super-admin?ok=' + encodeURIComponent(`Team member successfully assigned to property!`));
}

export async function quickSeedRooms(fd: FormData) {
  const propertyId = String(fd.get('propertyId') ?? '').trim();
  const floors = parseInt(String(fd.get('floors') ?? '3'), 10);
  const roomsPerFloor = parseInt(String(fd.get('roomsPerFloor') ?? '4'), 10);
  const startFloor = parseInt(String(fd.get('startFloor') ?? '1'), 10);
  const typeName = String(fd.get('typeName') ?? 'Deluxe Heritage Room').trim();
  const baseRate = parseFloat(String(fd.get('baseRate') ?? '4500'));
  const capacity = parseInt(String(fd.get('capacity') ?? '2'), 10);

  let error = '';
  try {
    await api(`/super-admin/properties/${propertyId}/seed-inventory`, {
      method: 'POST',
      body: JSON.stringify({
        floors,
        roomsPerFloor,
        startFloor,
        typeName,
        baseRate,
        capacity,
      }),
    });
  } catch (err) {
    error = errorMessage(err);
  }

  if (error) {
    redirect('/super-admin?error=' + encodeURIComponent(error));
  }

  revalidatePath('/super-admin');
  redirect('/super-admin?ok=' + encodeURIComponent(`Rooms and floors provisioned successfully!`));
}

export async function togglePropertyStatus(fd: FormData) {
  const propertyId = String(fd.get('propertyId') ?? '').trim();
  const currentStatus = String(fd.get('currentStatus') ?? 'active').trim();
  const targetStatus = currentStatus === 'active' ? 'suspended' : 'active';

  let error = '';
  try {
    await api(`/super-admin/properties/${propertyId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: targetStatus }),
    });
  } catch (err) {
    error = errorMessage(err);
  }

  if (error) {
    redirect('/super-admin?error=' + encodeURIComponent(error));
  }

  revalidatePath('/super-admin');
  redirect('/super-admin?ok=' + encodeURIComponent(`Hotel status updated to ${targetStatus}!`));
}

export async function switchHotelAndNavigate(fd: FormData) {
  const propertyId = String(fd.get('propertyId') ?? '').trim();
  const destination = String(fd.get('destination') ?? '/dashboard').trim();

  const result = await api<{ token: string }>('/auth/select-property', {
    method: 'POST',
    body: JSON.stringify({ propertyId }),
  });

  await storeToken(result.token);
  revalidatePath('/', 'layout');
  redirect(destination);
}
