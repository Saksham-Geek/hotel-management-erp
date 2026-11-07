import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { api, getMe, requireFeature } from '@/lib/api';
import { ReservationsView, type Room } from './reservations-view';
import { type ReservationRow } from './reservation-table';

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    roomId?: string;
    checkIn?: string;
    checkOut?: string;
  }>;
}) {
  const [me, { error, ok, roomId, checkIn, checkOut }, ent, reservations, rooms] = await Promise.all([
    getMe(),
    searchParams,
    requireFeature(FEATURES.HOTEL_RESERVATIONS),
    api<ReservationRow[]>('/hotel/reservations'),
    api<Room[]>('/hotel/rooms'),
  ]);

  if (me.role === 'housekeeping') {
    redirect(
      '/housekeeping?error=' +
        encodeURIComponent(
          'Access Restricted: Reservations management is reserved for Front Desk and Management.',
        ),
    );
  }

  const currency = me.property.currency;

  return (
    <ReservationsView
      reservations={reservations}
      rooms={rooms}
      currency={currency}
      readOnly={ent.readOnly}
      error={error}
      ok={ok}
      roomId={roomId}
      checkIn={checkIn}
      checkOut={checkOut}
    />
  );
}
