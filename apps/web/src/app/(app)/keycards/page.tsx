import { FEATURES } from '@erp/shared';
import { api, requireFeature } from '@/lib/api';
import {
  KeycardsView,
  type RoomKeyDto,
  type ActiveGuestStayDto,
} from './keycards-view';

export default async function KeycardsPage() {
  const [ent, keys, reservations] = await Promise.all([
    requireFeature(FEATURES.HOTEL_KEYCARDS),
    api<RoomKeyDto[]>('/hotel/keycards/keys').catch(() => []),
    api<any[]>('/hotel/reservations?status=checked_in').catch(() => []),
  ]);

  const activeStays: ActiveGuestStayDto[] = reservations
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
