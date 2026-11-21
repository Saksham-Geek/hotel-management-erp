import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { api, getMe, requireFeature } from '@/lib/api';
import { CaptainPosView } from './captain-pos-view';
import type {
  OutletDto,
  TableDto,
  MenuCategoryDto,
  KotOrderDto,
  CheckedInRoomDto,
} from '../restaurant-pos-view';

export default async function CaptainPosPage() {
  const [me, ent, outlets, tables, categories, kots, reservations] = await Promise.all([
    getMe(),
    requireFeature(FEATURES.HOTEL_RESTAURANT_POS),
    api<OutletDto[]>('/hotel/restaurant/outlets').catch(() => []),
    api<TableDto[]>('/hotel/restaurant/tables').catch(() => []),
    api<MenuCategoryDto[]>('/hotel/restaurant/menu').catch(() => []),
    api<KotOrderDto[]>('/hotel/restaurant/kots').catch(() => []),
    api<any[]>('/hotel/reservations?status=checked_in').catch(() => []),
  ]);

  if (me.role === 'housekeeping') {
    redirect('/housekeeping?error=' + encodeURIComponent('Access Restricted: Captain POS is restricted to F&B and Front Desk staff.'));
  }

  const checkedInRooms: CheckedInRoomDto[] = reservations.map((r) => ({
    id: r.id,
    number: r.roomNumber || '101',
    guestName: r.guestName || 'In-House Guest',
    reservationId: r.id,
  }));

  return (
    <CaptainPosView
      user={{
        fullName: me.fullName,
        email: me.email,
        role: me.role,
      }}
      outlets={outlets}
      tables={tables}
      categories={categories}
      kots={kots}
      checkedInRooms={checkedInRooms}
    />
  );
}
