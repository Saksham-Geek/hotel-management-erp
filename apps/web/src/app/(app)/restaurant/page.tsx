import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { api, getMe, requireFeature } from '@/lib/api';
import {
  RestaurantPosView,
  type OutletDto,
  type TableDto,
  type MenuCategoryDto,
  type KotOrderDto,
  type CheckedInRoomDto,
} from './restaurant-pos-view';

export default async function RestaurantPage() {
  const [me, ent, outlets, tables, categories, kots, reservations, activeShift] = await Promise.all([
    getMe(),
    requireFeature(FEATURES.HOTEL_RESTAURANT_POS),
    api<OutletDto[]>('/hotel/restaurant/outlets').catch(() => []),
    api<TableDto[]>('/hotel/restaurant/tables').catch(() => []),
    api<MenuCategoryDto[]>('/hotel/restaurant/menu').catch(() => []),
    api<KotOrderDto[]>('/hotel/restaurant/kots').catch(() => []),
    api<any[]>('/hotel/reservations?status=checked_in').catch(() => []),
    api<any>('/hotel/restaurant/shifts/active').catch(() => null),
  ]);

  if (me.role === 'housekeeping') {
    redirect(
      '/housekeeping?error=' +
        encodeURIComponent(
          'Access Restricted: Restaurant POS is restricted to Front Desk and F&B staff.',
        ),
    );
  }

  const checkedInRooms: CheckedInRoomDto[] = reservations
    .map((r) => ({
      id: r.id,
      number: r.roomNumber || '101',
      guestName: r.guestName || 'In-House Guest',
      reservationId: r.id,
    }));

  return (
    <div className="space-y-6">
      <RestaurantPosView
        outlets={outlets}
        tables={tables}
        categories={categories}
        kots={kots}
        checkedInRooms={checkedInRooms}
        initialShift={activeShift}
      />
    </div>
  );
}
