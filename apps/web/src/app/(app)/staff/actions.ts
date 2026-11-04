'use server';

import { revalidatePath } from 'next/cache';
import { api, errorMessage } from '@/lib/api';

export type ActionState = { error?: string; success?: string } | null;

export async function createStaff(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get('email')?.toString().trim();
  const fullName = formData.get('fullName')?.toString().trim();
  const role = formData.get('role')?.toString().trim();
  const department = formData.get('department')?.toString().trim();
  const shift = formData.get('shift')?.toString().trim();
  const password = formData.get('password')?.toString().trim() || 'HotelStaff123!';

  if (!email || !fullName || !role) {
    return { error: 'Email, Full Name, and Role are mandatory.' };
  }

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
    revalidatePath('/staff');
    return { success: `Successfully onboarded staff member ${fullName} as ${role.toUpperCase()}` };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function toggleStaffStatus(userId: string): Promise<ActionState> {
  try {
    await api(`/users/${userId}/status`, { method: 'PATCH' });
    revalidatePath('/staff');
    return { success: 'Staff status updated successfully.' };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function removeStaff(userId: string): Promise<ActionState> {
  try {
    await api(`/users/${userId}`, { method: 'DELETE' });
    revalidatePath('/staff');
    return { success: 'Staff member removed from this property.' };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}
