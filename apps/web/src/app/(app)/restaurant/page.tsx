import { FEATURES } from '@erp/shared';
import { api, requireFeature } from '@/lib/api';
import {
  RestaurantPosView,
  type OutletDto,
  type TableDto,
  type MenuCategoryDto,
  type KotOrderDto,
  type CheckedInRoomDto,
} from './restaurant-pos-view';

export default async function RestaurantPage() {
  await requireFeature(FEATURES.HOTEL_RESTAURANT_POS);

  const [outlets, tables, categories, kots, reservations] = await Promise.all([
    api<OutletDto[]>('/hotel/restaurant/outlets').catch(() => []),
    api<TableDto[]>('/hotel/restaurant/tables').catch(() => []),
    api<MenuCategoryDto[]>('/hotel/restaurant/menu').catch(() => []),
    api<KotOrderDto[]>('/hotel/restaurant/kots').catch(() => []),
    api<any[]>('/hotel/reservations').catch(() => []),
  ]);

  const checkedInRooms: CheckedInRoomDto[] = reservations
    .filter((r) => r.status === 'confirmed' || r.status === 'checked_in')
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
      />
    </div>
  );
}
