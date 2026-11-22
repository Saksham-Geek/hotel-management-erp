import { FEATURES } from '@erp/shared';
import { api, requireFeature } from '@/lib/api';
import {
  KeycardsView,
  type RoomKeyDto,
  type ActiveGuestStayDto,
} from './keycards-view';

export default async function KeycardsPage() {
  const [ent, keys, reservations, keySettings] = await Promise.all([
    requireFeature(FEATURES.HOTEL_KEYCARDS),
    api<RoomKeyDto[]>('/hotel/keycards/keys').catch(() => []),
    api<any[]>('/hotel/reservations').catch(() => []),
    api<{ keySystemMode: 'brass_only' | 'rfid_only' | 'hybrid'; enableMobileQr: boolean }>(
      '/hotel/keycards/settings',
    ).catch(() => ({ keySystemMode: 'hybrid' as const, enableMobileQr: true })),
  ]);

  const activeStays: ActiveGuestStayDto[] = (reservations || [])
    .filter((r) => Boolean(r && r.roomNumber && ['checked_in', 'reserved', 'confirmed'].includes(r.status)))
    .map((r) => ({
      reservationId: r.id,
      roomNumber: String(r.roomNumber).trim(),
      guestName: r.guestName || 'In-House Guest',
      guestPhone: r.guestPhone || undefined,
      guests: Array.isArray(r.guests) ? r.guests : [],
      checkIn: r.checkIn ? new Date(r.checkIn).toISOString() : new Date().toISOString(),
      checkOut: r.checkOut ? new Date(r.checkOut).toISOString() : new Date().toISOString(),
      checkInFormatted: r.checkIn
        ? new Date(r.checkIn).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        : 'Today',
      checkOutFormatted: r.checkOut
        ? new Date(r.checkOut).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
        : 'Tomorrow',
      status: r.status,
    }));

  return (
    <div className="space-y-6">
      <KeycardsView
        keys={keys}
        activeStays={activeStays}
        keySystemMode={keySettings.keySystemMode}
        enableMobileQr={keySettings.enableMobileQr}
      />
    </div>
  );
}
