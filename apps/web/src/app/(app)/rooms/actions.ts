'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, errorMessage } from '@/lib/api';

async function run(path: string, method: string, body: unknown, okMsg: string) {
  let error: string | null = null;
  try { await api(path, { method, body: JSON.stringify(body) }); } catch (e) { error = errorMessage(e); }
  revalidatePath('/rooms'); revalidatePath('/dashboard'); revalidatePath('/housekeeping');
  return error ? `error=${encodeURIComponent(error)}` : `ok=${encodeURIComponent(okMsg)}`;
}

export async function createRoomType(fd: FormData) {
  redirect('/rooms?' + (await run('/hotel/room-types', 'POST', {
    name: fd.get('name'), baseRate: fd.get('baseRate'), hourlyRate: fd.get('hourlyRate') || undefined, capacity: fd.get('capacity') || 2, description: fd.get('description') || undefined,
  }, 'Room type added')));
}

export async function updateRoomType(fd: FormData) {
  const hourlyRate = String(fd.get('hourlyRate') ?? '').trim();
  const description = String(fd.get('description') ?? '').trim();
  redirect('/rooms?' + (await run(`/hotel/room-types/${fd.get('id')}`, 'PATCH', {
    name: fd.get('name'),
    baseRate: Number(fd.get('baseRate')),
    hourlyRate: hourlyRate === '' ? null : Number(hourlyRate),
    capacity: Number(fd.get('capacity')),
    description: description || null,
  }, 'Room type and rates updated')));
}

export async function createRoom(fd: FormData) {
  redirect('/rooms?' + (await run('/hotel/rooms', 'POST', {
    roomTypeId: fd.get('roomTypeId'), number: fd.get('number'), floor: fd.get('floor') || 0,
    baseRate: fd.get('baseRate') || undefined, hourlyRate: fd.get('hourlyRate') || undefined,
  }, 'Room added')));
}

export async function updateRoom(fd: FormData) {
  const hourlyRate = String(fd.get('hourlyRate') ?? '').trim();
  redirect('/rooms?' + (await run(`/hotel/rooms/${fd.get('id')}`, 'PATCH', {
    roomTypeId: fd.get('roomTypeId'),
    number: fd.get('number'),
    floor: Number(fd.get('floor')),
    baseRate: String(fd.get('baseRate') ?? '').trim() === '' ? null : Number(fd.get('baseRate')),
    hourlyRate: hourlyRate === '' ? null : Number(hourlyRate),
  }, 'Room configuration updated')));
}

export async function setRoomStatus(fd: FormData) {
  const back = String(fd.get('back') || '/rooms');
  redirect(back + '?' + (await run(`/hotel/rooms/${fd.get('id')}/status`, 'PATCH', { status: fd.get('status') }, 'Room updated')));
}
