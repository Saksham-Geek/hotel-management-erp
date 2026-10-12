
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api, errorMessage } from '@/lib/api';

export async function searchGuestProfiles(q: string) {
  const term = q.trim();

  if (term.length < 2) {
    return [];
  }

  return api<
    {
      id: string;
      fullName: string;
      phone: string | null;
      email: string | null;
      vip: boolean;
      hasIdentityDocument: boolean;
    }[]
  >(`/hotel/guests?q=${encodeURIComponent(term)}`);
}

export async function createReservation(fd: FormData) {
  let error: string | null = null;
  let reservationCreated = false;

  try {
    const existingGuestId = String(fd.get('guestId') ?? '').trim();

    const guestIds = [
      ...new Set(
        fd
          .getAll('guestIds')
          .map(String)
          .map((id) => id.trim())
          .filter((id) => id && id !== existingGuestId),
      ),
    ];

    const savedCompanionsRaw = String(fd.get('newCompanions') ?? '[]');
    const draftCompanionRaw = String(fd.get('newCompanionDraft') ?? '');
    let newCompanions: unknown[];
    try {
      const saved = JSON.parse(savedCompanionsRaw);
      const draft = draftCompanionRaw ? JSON.parse(draftCompanionRaw) : null;
      if (!Array.isArray(saved) || (draft !== null && typeof draft !== 'object')) {
        throw new Error();
      }
      newCompanions = [...saved, ...(draft ? [draft] : [])];
    } catch {
      throw new Error('Companion details could not be read. Please check them and try again.');
    }

    if (newCompanions.length > 19) {
      throw new Error('A reservation can include up to 20 guests.');
    }

    const roomId = String(fd.get('roomId') ?? '').trim();
    const checkIn = String(fd.get('checkIn') ?? '').trim();
    const checkOut = String(fd.get('checkOut') ?? '').trim();
    const rateMode = String(fd.get('rateMode') ?? 'nightly');

    const checkInTime = String(
      fd.get('checkInTime') ?? '12:00',
    ).trim();

    const checkOutTime = String(
      fd.get('checkOutTime') ?? '11:00',
    ).trim();

    const unitRateOverrideRaw = String(
      fd.get('unitRateOverride') ?? '',
    ).trim();

    const overrideReason = String(
      fd.get('overrideReason') ?? '',
    ).trim();

    if (!roomId || !checkIn || !checkOut) {
      throw new Error('Select a room and both stay dates.');
    }

    if (!['nightly', 'hourly'].includes(rateMode)) {
      throw new Error('Select a valid rate mode.');
    }

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkInTime) ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(checkOutTime)
    ) {
      throw new Error('Enter valid check-in and check-out times.');
    }

    if (
      checkOut < checkIn ||
      (checkOut === checkIn &&
        (rateMode !== 'hourly' || checkOutTime <= checkInTime))
    ) {
      throw new Error(
        rateMode === 'hourly'
          ? 'Hourly check-out must be after check-in.'
          : 'Check-out date must be after check-in date.',
      );
    }

    const unitRateOverride = unitRateOverrideRaw === ''
      ? undefined
      : Number(unitRateOverrideRaw);

    if (unitRateOverride !== undefined &&
      (!Number.isFinite(unitRateOverride) || unitRateOverride < 0 || unitRateOverride > 10_000_000)) {
      throw new Error('Manual rate must be a valid amount between 0 and 10,000,000.');
    }

    if (unitRateOverride !== undefined && !overrideReason) {
      throw new Error(
        'Enter a reason for the manual rate, such as manager approval.',
      );
    }

    const newGuest = existingGuestId
      ? undefined
      : {
          fullName: String(
            fd.get('guestName') ?? '',
          ).trim(),
          phone: String(fd.get('guestPhone') ?? '').trim(),
          email:
            String(fd.get('guestEmail') ?? '').trim() ||
            undefined,
          idType: String(fd.get('guestIdType') ?? '').trim() || undefined,
          idNumber: String(fd.get('guestIdNumber') ?? '').trim() || undefined,
        };

    if (!existingGuestId && !newGuest?.fullName) {
      throw new Error(
        'Select an existing guest or enter a new guest name.',
      );
    }

    if (newGuest && !isValidPhone(newGuest.phone)) {
      throw new Error('Enter a valid phone number with 7 to 15 digits.');
    }
    const validIdentityTypes = ['aadhaar', 'passport', 'driving_license', 'voter_id', 'other'];
    if (newGuest && (!newGuest.idType || !validIdentityTypes.includes(newGuest.idType) || !newGuest.idNumber?.trim())) {
      throw new Error('Enter the primary guest’s identity type and ID number.');
    }
    for (const companion of newCompanions) {
      const guest = companion as { fullName?: unknown; phone?: unknown; email?: unknown; idType?: unknown; idNumber?: unknown };
      if (typeof guest.fullName !== 'string' || !guest.fullName.trim()) throw new Error('Every new companion needs a full name.');
      if (typeof guest.phone !== 'string' || !isValidPhone(guest.phone)) throw new Error(`Enter a valid phone number for ${guest.fullName} (7 to 15 digits).`);
      if (typeof guest.idType !== 'string' || !validIdentityTypes.includes(guest.idType) || typeof guest.idNumber !== 'string' || !guest.idNumber.trim()) throw new Error(`Enter the identity type and ID number for ${guest.fullName}.`);
      if (typeof guest.email === 'string' && guest.email && !isValidEmail(guest.email)) throw new Error(`Enter a valid email address for ${guest.fullName}, or leave it blank.`);
      if (guest.idType === 'aadhaar' && typeof guest.idNumber === 'string' && guest.idNumber && !/^\d{4}$/.test(guest.idNumber.trim())) throw new Error(`For Aadhaar, enter only the last four digits for ${guest.fullName}.`);
    }
    if (newGuest?.email && !isValidEmail(newGuest.email)) throw new Error('Enter a valid email address or leave it blank.');

    const primaryUpload = existingGuestId ? null : await prepareReservationIdentityUpload(fd, 'guest', true);
    const companionUploads = await Promise.all(newCompanions.map((companion, index) => {
      const clientKey = (companion as { clientKey?: unknown }).clientKey;
      const prefix = typeof clientKey === 'string' && /^[0-9a-f-]{36}$/i.test(clientKey) ? `companion_${clientKey}` : `draftCompanion`;
      return prepareReservationIdentityUpload(fd, prefix, true).then((upload) => ({ index, upload }));
    }));
    const existingIds = [...new Set([...(existingGuestId ? [existingGuestId] : []), ...guestIds])];
    const existingUploads = await Promise.all(existingIds.map(async (guestId) => ({
      guestId,
      upload: await prepareReservationIdentityUpload(fd, `existing_${guestId}`),
    })));
    const totalIdentityBytes = [primaryUpload, ...companionUploads.map(({ upload }) => upload), ...existingUploads.map(({ upload }) => upload)].reduce((sum, upload) => sum + (upload?.byteLength ?? 0), 0);
    if (totalIdentityBytes > 40 * 1024 * 1024) throw new Error('Identity images in one reservation submission cannot exceed 40 MB total.');

    if (newGuest && primaryUpload) Object.assign(newGuest, { identityDocument: primaryUpload.attachment });
    const preparedCompanions = newCompanions.map((companion, index) => ({
      ...(companion as Record<string, unknown>),
      identityDocument: companionUploads[index]?.upload?.attachment,
    }));
    if (preparedCompanions.some((guest) => !guest.identityDocument)) throw new Error('Upload an ID image for every new guest sharing this room.');
    const existingGuestDocuments = existingUploads.flatMap(({ guestId, upload }) => upload ? [{ guestId, attachment: upload.attachment }] : []);

    await api<{ id: string }>('/hotel/reservations', {
      method: 'POST',
      body: JSON.stringify({
        ...(existingGuestId
          ? { guestId: existingGuestId }
          : { newGuest }),

        guestIds,
        newCompanions: preparedCompanions,
        existingGuestDocuments,
        roomId,
        checkIn,
        checkOut,
        rateMode,
        checkInTime,
        checkOutTime,

        ...(unitRateOverride !== undefined
          ? { unitRateOverride }
          : {}),

        ...(overrideReason
          ? { overrideReason }
          : {}),
      }),
    });
    reservationCreated = true;
  } catch (e) {
    error = `${reservationCreated ? 'Reservation was created, but a related step failed. ' : ''}${errorMessage(e)}`;
  }

  revalidatePath('/reservations');
  revalidatePath('/dashboard');
  revalidatePath('/rooms');

  redirect(
    '/reservations?' +
      (error
        ? `error=${encodeURIComponent(error)}`
        : `ok=${encodeURIComponent(
            'Reservation and consolidated folio created',
          )}`),
  );
}

function isValidPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return /^\+?[0-9 ().-]{7,30}$/.test(value.trim()) && digits.length >= 7 && digits.length <= 15;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function prepareReservationIdentityUpload(fd: FormData, prefix: string, required = false) {
  const value = fd.get(`${prefix}Documents`);
  if (!(value instanceof File) || value.size === 0) {
    if (required) throw new Error('Upload an identity image for every guest.');
    return null;
  }
  if (value.size > 5 * 1024 * 1024) throw new Error('Identity images must be no larger than 5 MB each.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(value.type)) throw new Error('Identity images must be JPEG, PNG or WebP.');
  const consentMethod = String(fd.get(`${prefix}ConsentMethod`) ?? '');
  if (fd.get(`${prefix}ConsentGiven`) !== 'on' || !['written', 'verbal', 'digital'].includes(consentMethod)) {
    throw new Error('Record the guest’s informed consent method before uploading an identity image.');
  }
  const documentType = String(fd.get(`${prefix}DocumentType`) ?? 'other');
  const aadhaarMasked = fd.get(`${prefix}AadhaarMasked`) === 'on';
  if (documentType === 'aadhaar_masked' && !aadhaarMasked) throw new Error('Confirm the Aadhaar image has the first eight digits masked.');
  return {
    consentMethod,
    aadhaarMasked,
    byteLength: value.size,
    attachment: {
      fileName: value.name,
      mimeType: value.type,
      base64: Buffer.from(await value.arrayBuffer()).toString('base64'),
      documentType,
      consentGiven: true as const,
      consentMethod,
      aadhaarMasked,
    },
  };
}

export async function changeReservation(fd: FormData) {
  let error: string | null = null;
  const action = String(fd.get('action') ?? '');
  const id = String(fd.get('id') ?? '');

  try {
    if (!id) {
      throw new Error('Reservation ID is missing.');
    }

    if (!['check-in', 'check-out', 'cancel'].includes(action)) {
      throw new Error('Invalid reservation action.');
    }

    await api(`/hotel/reservations/${id}/${action}`, {
      method: 'POST',
    });
  } catch (e) {
    console.error('Reservation status change failed:', e);
    error = errorMessage(e);
  }

  revalidatePath('/reservations');
  revalidatePath('/dashboard');
  revalidatePath('/rooms');
  revalidatePath('/housekeeping');

  const done: Record<string, string> = {
    'check-in': 'Guest checked in',
    'check-out': 'Guest checked out',
    cancel: 'Reservation cancelled',
  };

  redirect(
    '/reservations?' +
      (error
        ? `error=${encodeURIComponent(error)}`
        : `ok=${encodeURIComponent(
            done[action] ?? 'Reservation updated',
          )}`),
  );
}
