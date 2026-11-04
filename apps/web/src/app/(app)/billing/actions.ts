'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { api } from '@/lib/api';

export async function addFolioCharge(formData: FormData) {
  const folioId = String(formData.get('folioId') ?? '');
  const reservationId = String(formData.get('reservationId') ?? '');
  const category = String(formData.get('category') ?? 'ACCOMMODATION');
  const description = String(formData.get('description') ?? '').trim();
  const quantity = parseFloat(String(formData.get('quantity') ?? '1')) || 1;
  const unitPrice = parseFloat(String(formData.get('unitPrice') ?? '0')) || 0;
  const isInterstate = formData.get('isInterstate') === 'on';

  try {
    await api(`/hotel/folios/${folioId}/charges`, {
      method: 'POST',
      body: JSON.stringify({ category, description, quantity, unitPrice, isInterstate }),
    });
  } catch (err) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    const message = err instanceof Error ? err.message : 'Could not add folio charge';
    redirect(`/billing?reservationId=${reservationId}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/billing');
  redirect(`/billing?reservationId=${reservationId}&ok=Charge+added+with+GST`);
}

export async function collectFolioPayment(formData: FormData) {
  const folioId = String(formData.get('folioId') ?? '');
  const reservationId = String(formData.get('reservationId') ?? '');
  const method = String(formData.get('method') ?? 'cash');
  const amount = parseFloat(String(formData.get('amount') ?? '0')) || 0;
  const reference = String(formData.get('reference') ?? '').trim() || undefined;
  const panNumber = String(formData.get('panNumber') ?? '').trim() || undefined;
  const corporateAccountId = String(formData.get('corporateAccountId') ?? '').trim() || undefined;

  try {
    await api(`/hotel/folios/${folioId}/payments`, {
      method: 'POST',
      body: JSON.stringify({ method, amount, reference, panNumber, corporateAccountId }),
    });
  } catch (err) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    const message = err instanceof Error ? err.message : 'Could not collect payment';
    redirect(`/billing?reservationId=${reservationId}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/billing');
  redirect(`/billing?reservationId=${reservationId}&ok=Payment+collected+successfully`);
}

export async function issueInvoice(formData: FormData) {
  const folioId = String(formData.get('folioId') ?? '');
  const reservationId = String(formData.get('reservationId') ?? '');
  const invoiceType = String(formData.get('invoiceType') ?? 'B2C');
  const guestGstin = String(formData.get('guestGstin') ?? '').trim() || undefined;
  const guestCompanyName = String(formData.get('guestCompanyName') ?? '').trim() || undefined;
  const placeOfSupplyStateCode = String(formData.get('placeOfSupplyStateCode') ?? '27').trim();
  const isInterstate = formData.get('isInterstate') === 'on';

  try {
    await api(`/hotel/folios/${folioId}/invoice`, {
      method: 'POST',
      body: JSON.stringify({
        invoiceType,
        guestGstin,
        guestCompanyName,
        placeOfSupplyStateCode,
        isInterstate,
      }),
    });
  } catch (err) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    const message = err instanceof Error ? err.message : 'Could not issue GST invoice';
    redirect(`/billing?reservationId=${reservationId}&error=${encodeURIComponent(message)}`);
  }

  revalidatePath('/billing');
  redirect(`/billing?reservationId=${reservationId}&ok=Official+GST+Tax+Invoice+issued+with+IRN`);
}
