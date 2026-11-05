import { notFound } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { BookingView, type HotelBookingProfile } from './booking-view';

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const profile = await fetch(`${API_URL}/public/hotels/${encodeURIComponent(slug)}`, {
    cache: 'no-store',
  })
    .then((r) => (r.ok ? r.json() : null))
    .catch((err) => {
      console.error('[PublicBooking] Failed to fetch hotel:', err);
      return null;
    });

  if (!profile || !profile.tenant) {
    notFound();
  }

  return <BookingView profile={profile as HotelBookingProfile} />;
}
