'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, errorMessage } from '@/lib/api';

export async function saveGuest(fd: FormData) {
  let error: string | null = null;
  let guestCreated = false;
  try {
    const documents = await prepareGuestDocuments(fd);
    if (documents.length && (fd.get('consentGiven') !== 'on' || !fd.get('consentMethod'))) {
      throw new Error('Confirm the guest was informed and record how consent was obtained before uploading identity images.');
    }
    const guest = await api<{ id: string }>('/hotel/guests', { method: 'POST', body: JSON.stringify({
      fullName: fd.get('fullName'), phone: fd.get('phone') || undefined, email: fd.get('email') || undefined,
      nationality: fd.get('nationality') || undefined, idType: fd.get('idType') || undefined,
      idNumber: fd.get('idNumber') || undefined, notes: fd.get('notes') || undefined,
      vip: fd.get('vip') === 'on',
    }) });
    guestCreated = true;
    if (documents.length) {
      await api(`/hotel/guests/${guest.id}/documents`, { method: 'POST', body: JSON.stringify({
        documents,
        consentGiven: true,
        consentMethod: fd.get('consentMethod'),
        aadhaarMasked: fd.get('aadhaarMasked') === 'on',
      }) });
    }
  } catch (e) { error = `${guestCreated ? 'Guest profile saved, but the identity image upload failed. Open the profile and retry. ' : ''}${errorMessage(e)}`; }
  revalidatePath('/guests'); revalidatePath('/reservations');
  redirect('/guests?' + (error ? `error=${encodeURIComponent(error)}` : 'ok=' + encodeURIComponent('Guest profile saved')));
}

export async function updateGuest(fd: FormData) {
  let error: string | null = null;
  const id = String(fd.get('id'));
  try {
    await api(`/hotel/guests/${id}`, { method: 'PATCH', body: JSON.stringify({
      fullName: fd.get('fullName'), phone: String(fd.get('phone') ?? '').trim() || undefined, email: fd.get('email') || '',
      nationality: fd.get('nationality') || undefined, idType: fd.get('idType') || undefined,
      idNumber: fd.get('idNumber') || undefined, notes: fd.get('notes') || undefined, vip: fd.get('vip') === 'on',
    }) });
  } catch (e) { error = errorMessage(e); }
  revalidatePath('/guests'); revalidatePath('/reservations');
  redirect('/guests?' + (error ? `error=${encodeURIComponent(error)}` : 'ok=' + encodeURIComponent('Guest profile updated')));
}

export async function uploadGuestDocuments(fd: FormData) {
  let error: string | null = null;
  const guestId = String(fd.get('guestId'));
  try {
    const documents = await prepareGuestDocuments(fd);
    if (!documents.length) throw new Error('Choose at least one identity image.');
    if (fd.get('consentGiven') !== 'on' || !fd.get('consentMethod')) throw new Error('Confirm the guest was informed and record how consent was obtained before uploading identity images.');
    await api(`/hotel/guests/${guestId}/documents`, { method: 'POST', body: JSON.stringify({
      documents,
      consentGiven: true,
      consentMethod: fd.get('consentMethod'),
      aadhaarMasked: fd.get('aadhaarMasked') === 'on',
    }) });
  } catch (e) { error = errorMessage(e); }
  revalidatePath('/guests');
  redirect('/guests?' + (error ? `error=${encodeURIComponent(error)}` : 'ok=' + encodeURIComponent('Identity images uploaded securely')));
}

async function prepareGuestDocuments(fd: FormData) {
  const files = fd.getAll('documents').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 8) throw new Error('Upload up to 8 identity images per submission.');
  const documentType = String(fd.get('documentType') || 'other');
  const documents = [];
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} exceeds the 5 MB per-image limit.`);
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error(`${file.name}: use JPEG, PNG or WebP images.`);
    documents.push({ fileName: file.name, mimeType: file.type, base64: Buffer.from(await file.arrayBuffer()).toString('base64'), documentType });
  }
  return documents;
}
