import { FEATURES } from '@erp/shared';
import type { RoomStatus } from '@erp/shared';
import { Banner, btnCls, PageHeader, RoomTile } from '@/components/ui';
import { api, requireFeature } from '@/lib/api';
import { setRoomStatus } from '../rooms/actions';

interface Room { id: string; number: string; floor: number; status: RoomStatus; roomType: string }

export default async function Housekeeping({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const [{ error, ok }, ent] = await Promise.all([searchParams, requireFeature(FEATURES.HOTEL_HOUSEKEEPING)]);
  const rooms = (await api<Room[]>('/hotel/rooms')).filter((r) => r.status === 'cleaning' || r.status === 'maintenance');

  return (
    <>
      <PageHeader title="Housekeeping" />
      <Banner error={error} ok={ok} />
      {rooms.length === 0 ? (
        <p className="max-w-md text-muted">Every room is ready or occupied. Rooms appear here after check-out.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {rooms.map((r) => (
            <RoomTile key={r.id} number={r.number} type={r.roomType} status={r.status}>
              {r.status === 'maintenance' ? (
                <p className="mt-3 text-xs text-muted">Only an owner or manager can change maintenance status.</p>
              ) : !ent.readOnly && (
                <form action={setRoomStatus} className="mt-3">
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="back" value="/housekeeping" />
                  <input type="hidden" name="status" value="available" />
                  <button className={`${btnCls} w-full !py-1.5`}>Mark ready</button>
                </form>
              )}
            </RoomTile>
          ))}
        </div>
      )}
    </>
  );
}
