import Link from 'next/link';
import { FEATURES } from '@erp/shared';
import { Banner, btnCls, PageHeader, StatCard } from '@/components/ui';
import { api, getMe, requireFeature } from '@/lib/api';
import { RoomInventory, type RoomRecord, type RoomTypeRecord } from './room-inventory';

export default async function RoomsPage({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const [{ error, ok }, ent, me, rooms, types] = await Promise.all([
    searchParams,
    requireFeature(FEATURES.HOTEL_ROOMS),
    getMe(),
    api<RoomRecord[]>('/hotel/rooms'),
    api<RoomTypeRecord[]>('/hotel/room-types'),
  ]);
  const canManage = me.role === 'owner' || me.role === 'manager';
  const ready = rooms.filter((room) => room.status === 'available').length;
  const occupied = rooms.filter((room) => room.status === 'occupied').length;
  const unavailable = rooms.filter((room) => room.status === 'cleaning' || room.status === 'maintenance').length;

  return (
    <>
      <PageHeader
        title="Rooms &amp; Floors"
        eyebrow="Room Status &amp; Cleaning"
        description="Live room statuses, housekeeping cleaning progress, and room occupancy details."
      >
        {canManage && !ent.readOnly && (
          <Link href="/settings?tab=rooms" className={btnCls}>
            ⚙️ Configure Rooms &amp; Rates in Settings &rarr;
          </Link>
        )}
      </PageHeader>
      <Banner error={error} ok={ok} />

      {ent.readOnly && (
        <div role="status" className="mb-5 rounded-lg border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-ink">
          Configuration changes are paused while this subscription is read-only.
        </div>
      )}

      <section aria-label="Room inventory summary" className="mb-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard label="Total rooms" value={rooms.length} detail={`${types.length} room types`} />
        <StatCard label="Ready" value={ready} detail="Available for sale" />
        <StatCard label="Occupied" value={occupied} detail="Active stays" />
        <StatCard label="Needs attention" value={unavailable} detail="Cleaning or maintenance" />
      </section>

      <RoomInventory rooms={rooms} types={types} currency={me.property.currency} role={me.role} readOnly={ent.readOnly} />
    </>
  );
}
