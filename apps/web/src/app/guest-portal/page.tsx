import { api } from '@/lib/api';
import { GuestPortalClient } from './guest-portal-client';

export const metadata = {
  title: 'In-Room Smart Guest Concierge | Hotel Grand Azure',
  description: 'Order room service, request fresh towels, copy Wi-Fi password, and chat with hotel front desk.',
};

export default async function GuestPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const conciergeSettings = await api<any>('/hotel/expenses/concierge-settings').catch(() => ({
    wifiSsid: 'GrandAzure_Guest_5G',
    wifiPassword: 'Welcome2026!',
    receptionPhone: '+91 98765 43210',
    receptionWhatsapp: '+91 98765 43210',
    breakfastTiming: '7:00 AM - 10:30 AM (Coral Cafe)',
    poolTiming: '6:00 AM - 8:00 PM',
    gymTiming: '24 Hours (Keycard Access)',
    googleReviewUrl: 'https://maps.google.com',
  }));

  return <GuestPortalClient searchParams={searchParams} initialSettings={conciergeSettings} />;
}
