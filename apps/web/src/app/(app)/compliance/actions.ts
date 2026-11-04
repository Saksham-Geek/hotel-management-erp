'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';

export async function createFormC(formData: FormData) {
  const reservationId = String(formData.get('reservationId') ?? '');
  const guestId = String(formData.get('guestId') ?? '');
  const passportNumber = String(formData.get('passportNumber') ?? '').trim();
  const passportCountry = String(formData.get('passportCountry') ?? '').trim();
  const passportIssueDate = String(formData.get('passportIssueDate') ?? '');
  const passportExpiryDate = String(formData.get('passportExpiryDate') ?? '');
  const visaNumber = String(formData.get('visaNumber') ?? '').trim();
  const visaType = String(formData.get('visaType') ?? '').trim();
  const visaValidUntil = String(formData.get('visaValidUntil') ?? '');
  const visaIssuePlace = String(formData.get('visaIssuePlace') ?? '').trim();
  const arrivalDateInIndia = String(formData.get('arrivalDateInIndia') ?? '');
  const arrivedFromCityCountry = String(formData.get('arrivedFromCityCountry') ?? '').trim();
  const nextDestinationCityCountry = String(formData.get('nextDestinationCityCountry') ?? '').trim();
  const purposeOfVisit = String(formData.get('purposeOfVisit') ?? 'tourism');
  const employedInIndia = formData.get('employedInIndia') === 'on';

  try {
    await api('/hotel/compliance/form-c', {
      method: 'POST',
      body: JSON.stringify({
        reservationId,
        guestId,
        passportNumber,
        passportCountry,
        passportIssueDate,
        passportExpiryDate,
        visaNumber,
        visaType,
        visaValidUntil,
        visaIssuePlace,
        arrivalDateInIndia,
        arrivedFromCityCountry,
        nextDestinationCityCountry,
        purposeOfVisit,
        employedInIndia,
      }),
    });
  } catch (err) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    const message = err instanceof Error ? err.message : 'Could not create Form C';
    redirect(`/compliance?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/compliance');
  redirect('/compliance?ok=Form+C+foreigner+registration+created');
}

export async function submitFormC(formData: FormData) {
  const id = String(formData.get('id') ?? '');
  try {
    await api(`/hotel/compliance/form-c/${id}/submit`, {
      method: 'POST',
    });
  } catch (err) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    const message = err instanceof Error ? err.message : 'Submission to BoI failed';
    redirect(`/compliance?error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/compliance');
  redirect('/compliance?ok=Form+C+submitted+to+Bureau+of+Immigration');
}
