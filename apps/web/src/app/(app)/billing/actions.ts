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

  // POS Machine metadata
  const posTerminalId = String(formData.get('posTerminalId') ?? '').trim() || undefined;
  const cardBrand = String(formData.get('cardBrand') ?? '').trim() || undefined;
  const cardLastFour = String(formData.get('cardLastFour') ?? '').trim() || undefined;
  const bankRrn = String(formData.get('bankRrn') ?? '').trim() || undefined;
  const authCode = String(formData.get('authCode') ?? '').trim() || undefined;
  let posSlipData: any = undefined;
  const rawSlip = formData.get('posSlipData');
  if (rawSlip && typeof rawSlip === 'string') {
    try {
      posSlipData = JSON.parse(rawSlip);
    } catch {}
  }

  try {
    await api(`/hotel/folios/${folioId}/payments`, {
      method: 'POST',
      body: JSON.stringify({
        method,
        amount,
        reference,
        panNumber,
        corporateAccountId,
        posTerminalId,
        cardBrand,
        cardLastFour,
        bankRrn,
        authCode,
        posSlipData,
      }),
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

export async function updateUpiSettingsAction(formData: FormData) {
  const upiId = String(formData.get('upiId') ?? '').trim().toLowerCase();
  const upiMerchantName = String(formData.get('upiMerchantName') ?? '').trim() || undefined;
  const reservationId = String(formData.get('reservationId') ?? '');

  const redirectBase = reservationId ? `/billing?reservationId=${reservationId}` : '/billing';

  try {
    const res = await api<{ message: string }>('/hotel/upi-settings', {
      method: 'PATCH',
      body: JSON.stringify({ upiId, upiMerchantName }),
    });
    revalidatePath('/billing');
    redirect(`${redirectBase}${redirectBase.includes('?') ? '&' : '?'}ok=${encodeURIComponent(res.message || 'Receiver UPI ID updated successfully')}`);
  } catch (err: any) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    const message = err instanceof Error ? err.message : 'Failed to update receiver UPI ID';
    redirect(`${redirectBase}${redirectBase.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
  }
}

// --- POS Machine Server Actions ---

export async function initiatePosChargeAction(input: {
  terminalId: string;
  folioId: string;
  amount: number;
  currency?: string;
  reservationId?: string;
}) {
  try {
    const res = await api<any>('/hotel/pos/initiate-charge', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    revalidatePath('/billing');
    return { success: true, data: res };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'POS machine transaction failed or timed out',
    };
  }
}

export async function pingPosTerminalAction(terminalId: string) {
  try {
    const res = await api<any>(`/hotel/pos/terminals/${terminalId}/ping`, {
      method: 'POST',
    });
    return { success: true, data: res };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Could not reach POS terminal',
    };
  }
}

export async function createPosTerminalAction(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const terminalId = String(formData.get('terminalId') ?? '').trim();
  const merchantId = String(formData.get('merchantId') ?? '').trim() || undefined;
  const provider = String(formData.get('provider') ?? 'pine_labs');
  const connectionType = String(formData.get('connectionType') ?? 'cloud_lan');
  const ipAddress = String(formData.get('ipAddress') ?? '').trim() || undefined;
  const port = parseInt(String(formData.get('port') ?? '8080'), 10) || 8080;
  const isDefault = formData.get('isDefault') === 'on';
  const reservationId = String(formData.get('reservationId') ?? '');

  const redirectBase = reservationId ? `/billing?reservationId=${reservationId}` : '/billing';

  try {
    await api('/hotel/pos/terminals', {
      method: 'POST',
      body: JSON.stringify({
        name,
        terminalId,
        merchantId,
        provider,
        connectionType,
        ipAddress,
        port,
        isDefault,
      }),
    });
    revalidatePath('/billing');
    redirect(`${redirectBase}${redirectBase.includes('?') ? '&' : '?'}ok=POS+terminal+registered+successfully`);
  } catch (err: any) {
    if ((err as any)?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    const message = err instanceof Error ? err.message : 'Failed to register POS terminal';
    redirect(`${redirectBase}${redirectBase.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`);
  }
}

export async function getPosTerminalsAction() {
  try {
    const res = await api<{ terminals: any[] }>('/hotel/pos/terminals');
    return res.terminals || [];
  } catch {
    return [];
  }
}

