'use server';

import { revalidatePath } from 'next/cache';
import { api, errorMessage } from '@/lib/api';

export type ActionState = { error?: string; success?: string; payload?: any } | null;

export async function sendReviewRequest(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const guestId = formData.get('guestId')?.toString();
  const reservationId = formData.get('reservationId')?.toString() || undefined;
  const channel = formData.get('channel')?.toString() || 'whatsapp';
  const platform = formData.get('platform')?.toString() || 'google';
  const recipientPhone = formData.get('recipientPhone')?.toString() || undefined;
  const recipientEmail = formData.get('recipientEmail')?.toString() || undefined;
  const customMessage = formData.get('customMessage')?.toString() || undefined;

  if (!guestId) {
    return { error: 'Guest ID is required to dispatch follow-up.' };
  }

  try {
    const res = await api('/hotel/marketing/send-review-request', {
      method: 'POST',
      body: JSON.stringify({
        guestId,
        reservationId,
        channel,
        platform,
        recipientPhone,
        recipientEmail,
        customMessage,
      }),
    });
    revalidatePath('/marketing');
    return { success: 'Review outreach message dispatched successfully!', payload: res };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function createCampaign(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const title = formData.get('title')?.toString().trim();
  const campaignType = formData.get('campaignType')?.toString().trim();
  const channel = formData.get('channel')?.toString().trim() || 'whatsapp';
  const audienceSegment = formData.get('audienceSegment')?.toString().trim() || 'all_guests';
  const templateMessage = formData.get('templateMessage')?.toString().trim();
  const discountCode = formData.get('discountCode')?.toString().trim() || undefined;

  if (!title || !templateMessage || !campaignType) {
    return { error: 'Title, Campaign Type, and Message Template are required.' };
  }

  try {
    const res = await api('/hotel/marketing/campaigns', {
      method: 'POST',
      body: JSON.stringify({
        title,
        campaignType,
        channel,
        audienceSegment,
        templateMessage,
        discountCode,
      }),
    });
    revalidatePath('/marketing');
    return { success: `Campaign "${title}" dispatched successfully!`, payload: res };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}

export async function updateGuestLoyalty(
  guestId: string,
  payload: {
    tier?: string;
    preferences?: Record<string, any>;
    anniversaryDate?: string | null;
    birthdayDate?: string | null;
    pointsAdjustment?: number;
  },
): Promise<ActionState> {
  try {
    const res = await api(`/hotel/marketing/guests/${guestId}/loyalty`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    revalidatePath('/marketing');
    return { success: 'Guest loyalty profile updated.', payload: res };
  } catch (err) {
    return { error: errorMessage(err) };
  }
}
