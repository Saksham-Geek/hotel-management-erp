import { FEATURES } from '@erp/shared';
import { api, requireFeature } from '@/lib/api';
import {
  KeycardsView,
  type RoomKeyDto,
  type ActiveGuestStayDto,
} from './keycards-view';

export default async function KeycardsPage() {
  await requireFeature(FEATURES.HOTEL_KEYCARDS);

  const [keys, reservations] = await Promise.all([
    api<RoomKeyDto[]>('/hotel/keycards/keys').catch(() => []),
    api<any[]>('/hotel/reservations').catch(() => []),
  ]);

  const activeStays: ActiveGuestStayDto[] = reservations
    .filter((r) => r.status === 'confirmed' || r.status === 'checked_in')
    .map((r) => ({
      reservationId: r.id,
      roomNumber: r.roomNumber || '101',
      guestName: r.guestName || 'In-House Guest',
      checkIn: r.checkIn ? new Date(r.checkIn).toLocaleDateString('en-IN') : 'Today',
      checkOut: r.checkOut ? new Date(r.checkOut).toLocaleDateString('en-IN') : 'Tomorrow',
    }));

  return (
    <div className="space-y-6">
      <KeycardsView keys={keys} activeStays={activeStays} />
    </div>
  );
}
