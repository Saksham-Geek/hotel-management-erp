import { FEATURES } from '@erp/shared';
import type { RoomStatus } from '@erp/shared';
import { Banner, btnCls, EmptyState, PageHeader, RoomTile, StatCard } from '@/components/ui';
import { api, requireFeature } from '@/lib/api';
import { setRoomStatus } from '../rooms/actions';

interface Room { id: string; number: string; floor: number; status: RoomStatus; roomType: string }

export default async function Housekeeping({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const [{ error, ok }, ent] = await Promise.all([searchParams, requireFeature(FEATURES.HOTEL_HOUSEKEEPING)]);
  const rooms = (await api<Room[]>('/hotel/rooms')).filter((room) => room.status === 'cleaning' || room.status === 'maintenance');
  const cleaning = rooms.filter((room) => room.status === 'cleaning');
  const maintenance = rooms.filter((room) => room.status === 'maintenance');

  return (
    <>
      <PageHeader title="Housekeeping" eyebrow="Room operations" description="Rooms needing attention after a stay or during maintenance." />
      <Banner error={error} ok={ok} />
      <section aria-label="Housekeeping queue summary" className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Ready for cleaning" value={cleaning.length} detail="Mark ready when service is complete" />
        <StatCard label="Maintenance" value={maintenance.length} detail="Unavailable for guest stays" />
      </section>
      {rooms.length === 0 ? (
        <EmptyState title="All clear" description="There are no rooms in the cleaning or maintenance queue right now." />
      ) : (
        <section aria-labelledby="housekeeping-queue-title">
          <div className="mb-3 flex items-center gap-3"><h2 id="housekeeping-queue-title" className="font-display text-lg font-bold text-ink">Attention queue</h2><span className="rounded-full bg-ground px-2.5 py-1 text-[10px] font-semibold text-muted">{rooms.length}</span></div>
          <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {rooms.map((room) => (
              <RoomTile key={room.id} number={room.number} type={`${room.roomType} · Floor ${room.floor}`} status={room.status}>
                {room.status === 'maintenance' ? (
                  <p className="text-xs leading-5 text-muted">Only an owner or manager can change maintenance status from Rooms.</p>
                ) : ent.readOnly ? (
                  <p className="text-xs leading-5 text-muted">Read-only mode prevents room status changes.</p>
                ) : (
                  <form action={setRoomStatus}>
                    <input type="hidden" name="id" value={room.id} />
                    <input type="hidden" name="back" value="/housekeeping" />
                    <input type="hidden" name="status" value="available" />
                    <button className={`${btnCls} w-full text-xs`}>Mark room ready</button>
                  </form>
                )}
              </RoomTile>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
