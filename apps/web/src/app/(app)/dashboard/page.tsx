import type { RoomStatus } from '@erp/shared';
import { FEATURES } from '@erp/shared';
import { PageHeader, RoomTile, STATUS_META } from '@/components/ui';
import { api, requireFeature } from '@/lib/api';

interface Room { id: string; number: string; floor: number; status: RoomStatus; roomType: string }
interface Dash { totalRooms: number; byStatus: Record<string, number>; arrivalsToday: number; departuresToday: number }

export default async function Dashboard() {
  await requireFeature(FEATURES.HOTEL_ROOMS);
  const [dash, rooms] = await Promise.all([api<Dash>('/hotel/dashboard'), api<Room[]>('/hotel/rooms')]);
  const floors = [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b);
  const occupied = dash.byStatus.occupied ?? 0;

  return (
    <>
      <PageHeader title="Today" />
      <dl className="mb-10 grid max-w-3xl grid-cols-2 gap-x-8 gap-y-6 border-y border-line py-6 sm:grid-cols-4">
        <Stat label="Rooms occupied" value={`${occupied} of ${dash.totalRooms}`} />
        <Stat label="Arriving today" value={String(dash.arrivalsToday)} />
        <Stat label="Leaving today" value={String(dash.departuresToday)} />
        <Stat label="Ready to sell" value={String(dash.byStatus.available ?? 0)} />
      </dl>

      {rooms.length === 0 ? (
        <p className="max-w-md text-muted">No rooms yet. Add your room types and rooms to see the board.</p>
      ) : (
        floors.map((f) => (
          <section key={f} className="mb-8">
            <h2 className="mb-3 font-display text-lg font-bold">Floor {f}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {rooms.filter((r) => r.floor === f).map((r) => (
                <RoomTile key={r.id} number={r.number} type={r.roomType} status={r.status} />
              ))}
            </div>
          </section>
        ))
      )}
      <p className="sr-only">{Object.values(STATUS_META).map((m) => m.label).join(', ')}</p>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 font-display text-3xl font-bold">{value}</dd>
    </div>
  );
}
