import { notFound } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { RoomServiceGuestView } from './room-service-view';

export default async function GuestRoomServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ roomNumber: string }>;
  searchParams: Promise<{ slug?: string }>;
}) {
  const { roomNumber } = await params;
  const sp = await searchParams;
  const slug = sp?.slug || 'grand-azure';

  const res = await fetch(
    `${API_URL}/public/room-service/${encodeURIComponent(slug)}/${encodeURIComponent(roomNumber)}`,
    {
      cache: 'no-store',
    }
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch((err) => {
      console.error('[RoomService] Fetch failed:', err);
      return null;
    });

  if (!res) {
    notFound();
  }

  return <RoomServiceGuestView initialData={res} tenantSlug={slug} roomNumber={roomNumber} />;
}
