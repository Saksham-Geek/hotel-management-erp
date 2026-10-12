import Link from 'next/link';
import type { RoomStatus } from '@erp/shared';
import { FEATURES } from '@erp/shared';
import { EmptyState, PageHeader, RoomTile, StatCard } from '@/components/ui';
import { api, getMe, requireFeature } from '@/lib/api';

interface Room { id: string; number: string; floor: number; status: RoomStatus; roomType: string }
interface Dash { totalRooms: number; byStatus: Record<string, number>; arrivalsToday: number; departuresToday: number }

export default async function Dashboard() {
  await requireFeature(FEATURES.HOTEL_ROOMS);
  const [dash, rooms, me] = await Promise.all([
    api<Dash>('/hotel/dashboard'),
    api<Room[]>('/hotel/rooms'),
    getMe(),
  ]);
  const floors = [...new Set(rooms.map((room) => room.floor))].sort((a, b) => a - b);
  const occupied = dash.byStatus.occupied ?? 0;
  const ready = dash.byStatus.available ?? 0;
  const occupancy = dash.totalRooms ? Math.round((occupied / dash.totalRooms) * 100) : 0;
  const hotelDate = new Intl.DateTimeFormat('en', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: me.property.timezone,
  }).format(new Date());

  return (
    <>
      <PageHeader
        title="Today"
        eyebrow="Operations overview"
        description={`${hotelDate} · ${me.property.name}`}
      >
        <Link href="/reservations#new-reservation" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lagoon focus-visible:ring-offset-2">
          <span aria-hidden className="text-base leading-none">+</span> New reservation
        </Link>
        <Link href="/rooms" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink shadow-sm transition hover:bg-ground">View rooms</Link>
      </PageHeader>

      <section aria-label="Today's hotel metrics" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Occupied rooms" value={`${occupied} / ${dash.totalRooms}`} detail={`${occupancy}% occupancy`} />
        <StatCard label="Arrivals today" value={dash.arrivalsToday} detail="Expected check-ins" />
        <StatCard label="Departures today" value={dash.departuresToday} detail="Expected check-outs" />
        <StatCard label="Ready to sell" value={ready} detail="Available rooms" />
      </section>

      <section aria-labelledby="room-board-title">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="room-board-title" className="font-display text-lg font-bold tracking-tight text-ink">Room board</h2>
            <p className="mt-1 text-xs text-muted">Live room status for this property</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            <Legend status="available" label="Ready" />
            <Legend status="occupied" label="Occupied" />
            <Legend status="cleaning" label="Cleaning" />
            <Legend status="maintenance" label="Maintenance" />
          </div>
        </div>

        {rooms.length === 0 ? (
          <EmptyState title="No rooms configured yet" description="Create room types and add rooms to start using the live room board." action={<Link href="/rooms" className="text-sm font-semibold text-lagoon-dark underline underline-offset-4">Configure rooms</Link>} />
        ) : (
          floors.map((floor) => (
            <section key={floor} aria-labelledby={`floor-${floor}`} className="mb-6">
              <div className="mb-2.5 flex items-center gap-2">
                <h3 id={`floor-${floor}`} className="text-xs font-semibold text-ink">Floor {floor}</h3>
                <span className="h-px flex-1 bg-line" />
                <span className="text-[11px] text-muted">{rooms.filter((room) => room.floor === floor).length} rooms</span>
              </div>
              <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                {rooms.filter((room) => room.floor === floor).map((room) => (
                  <RoomTile key={room.id} number={room.number} type={room.roomType} status={room.status} />
                ))}
              </div>
            </section>
          ))
        )}
      </section>
    </>
  );
}

function Legend({ status, label }: { status: RoomStatus; label: string }) {
  const color: Record<RoomStatus, string> = {
    available: 'bg-status-ready', occupied: 'bg-status-occupied', cleaning: 'bg-status-cleaning', maintenance: 'bg-status-out',
  };
  return <span className="inline-flex items-center gap-1.5"><span aria-hidden className={`h-1.5 w-1.5 rounded-full ${color[status]}`} />{label}</span>;
}
