'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, errorMessage } from '@/lib/api';
import { formatDocumentFileName } from '@erp/shared';

export async function saveGuest(fd: FormData) {
  let error: string | null = null;
  let guestCreated = false;
  try {
    const fullName = String(fd.get('fullName') ?? '').trim();
    const phone = String(fd.get('phone') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim() || undefined;
    const nationality = String(fd.get('nationality') ?? '').trim() || undefined;
    const idType = String(fd.get('idType') ?? '').trim();
    const idNumber = String(fd.get('idNumber') ?? '').trim();

    if (!fullName) throw new Error('Full name is required.');
    if (!phone) throw new Error('Phone number is required.');
    if (!idType) throw new Error('ID document type is required.');
    if (!idNumber) throw new Error('Identity number is required.');
    if (idType.toLowerCase() === 'aadhaar' && !/^\d{4}$/.test(idNumber)) {
      throw new Error('For Aadhaar, enter only the last 4 digits.');
    }
    if (idType.toLowerCase() === 'aadhaar' && fd.get('aadhaarMasked') !== 'on') {
      throw new Error('For Aadhaar, confirm that the first eight digits are masked.');
    }

    const documents = await prepareGuestDocuments(fd, fullName);
    if (!documents.length) {
      throw new Error('Upload at least one identity document file (PDF, JPEG, PNG, or WebP). Uploading an identity document is mandatory for statutory hotel KYC compliance.');
    }
    if (fd.get('consentGiven') !== 'on' || !fd.get('consentMethod')) {
      throw new Error('Confirm the guest was informed and record how consent was obtained before uploading identity documents.');
    }

    const guest = await api<{ id: string }>('/hotel/guests', { method: 'POST', body: JSON.stringify({
      fullName,
      phone,
      email,
      nationality,
      idType,
      idNumber,
      notes: fd.get('notes') || undefined,
      vip: fd.get('vip') === 'on',
    }) });
    guestCreated = true;

    await api(`/hotel/guests/${guest.id}/documents`, { method: 'POST', body: JSON.stringify({
      documents,
      consentGiven: true,
      consentMethod: fd.get('consentMethod'),
      aadhaarMasked: fd.get('aadhaarMasked') === 'on',
    }) });
  } catch (e) { error = `${guestCreated ? 'Guest profile saved, but the identity document upload failed. Open the profile and retry. ' : ''}${errorMessage(e)}`; }
  revalidatePath('/guests'); revalidatePath('/reservations');
  redirect('/guests?' + (error ? `error=${encodeURIComponent(error)}` : 'ok=' + encodeURIComponent('Guest profile saved')));
}

export async function updateGuest(fd: FormData) {
  let error: string | null = null;
  const id = String(fd.get('id'));
  try {
    const idType = String(fd.get('idType') ?? '').trim() || undefined;
    const idNumber = String(fd.get('idNumber') ?? '').trim() || undefined;
    if (idType?.toLowerCase() === 'aadhaar' && idNumber && !/^\d{4}$/.test(idNumber)) {
      throw new Error('For Aadhaar, enter only the last 4 digits.');
    }

    await api(`/hotel/guests/${id}`, { method: 'PATCH', body: JSON.stringify({
      fullName: fd.get('fullName'),
      phone: String(fd.get('phone') ?? '').trim() || undefined,
      email: String(fd.get('email') ?? '').trim() || '',
      nationality: String(fd.get('nationality') ?? '').trim() || undefined,
      idType,
      idNumber,
      notes: fd.get('notes') || undefined,
      vip: fd.get('vip') === 'on',
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
    if (!documents.length) throw new Error('Choose at least one identity document (PDF, JPEG, PNG, or WebP).');
    if (fd.get('consentGiven') !== 'on' || !fd.get('consentMethod')) throw new Error('Confirm the guest was informed and record how consent was obtained before uploading identity documents.');
    await api(`/hotel/guests/${guestId}/documents`, { method: 'POST', body: JSON.stringify({
      documents,
      consentGiven: true,
      consentMethod: fd.get('consentMethod'),
      aadhaarMasked: fd.get('aadhaarMasked') === 'on',
    }) });
  } catch (e) { error = errorMessage(e); }
  revalidatePath('/guests');
  redirect('/guests?' + (error ? `error=${encodeURIComponent(error)}` : 'ok=' + encodeURIComponent('Identity documents uploaded securely')));
}

async function prepareGuestDocuments(fd: FormData, guestName?: string) {
  const files = fd.getAll('documents').filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 8) throw new Error('Upload up to 8 identity documents per submission.');
  const documentType = String(fd.get('documentType') || 'other');
  const documents = [];
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name} exceeds the 5 MB limit.`);
    if (!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type)) throw new Error(`${file.name}: use PDF, JPEG, PNG or WebP documents.`);
    const cleanFileName = formatDocumentFileName(guestName, documentType, file.type, false);
    documents.push({ fileName: cleanFileName, mimeType: file.type, base64: Buffer.from(await file.arrayBuffer()).toString('base64'), documentType });
  }
  return documents;
}
