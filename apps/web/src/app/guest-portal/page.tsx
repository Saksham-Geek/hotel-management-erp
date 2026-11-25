import { GuestPortalClient } from './guest-portal-client';

export const metadata = {
  title: 'In-Room Smart Guest Concierge | Hotel Grand Azure',
  description: 'Order room service, request fresh towels, copy Wi-Fi password, and chat with hotel front desk.',
};

export default function GuestPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  return <GuestPortalClient searchParams={searchParams} />;
}
