import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { RoomStatus } from '@erp/shared';
import { FEATURES } from '@erp/shared';
import { btnCls, btnGhostCls, EmptyState, PageHeader, RoomTile, StatCard } from '@/components/ui';
import { api, getMe, requireFeature } from '@/lib/api';

interface Room {
  id: string;
  number: string;
  floor: number;
  status: RoomStatus;
  roomType: string;
}

interface Dash {
  totalRooms: number;
  byStatus: Record<string, number>;
  arrivalsToday: number;
  departuresToday: number;
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; ok?: string }>;
}) {
  const [me, ent, { error, ok } = {}, dash, rooms] = await Promise.all([
    getMe(),
    requireFeature(FEATURES.HOTEL_ROOMS),
    searchParams ? searchParams : Promise.resolve({ error: undefined, ok: undefined }),
    api<Dash>('/hotel/dashboard').catch(() => ({ totalRooms: 0, byStatus: {}, arrivalsToday: 0, departuresToday: 0 })),
    api<Room[]>('/hotel/rooms').catch(() => []),
  ]);

  if (me.role === 'housekeeping') {
    redirect('/housekeeping');
  }

  const safeDash: Dash = dash ?? { totalRooms: 0, byStatus: {}, arrivalsToday: 0, departuresToday: 0 };
  const safeByStatus = safeDash.byStatus ?? {};
  const floors = [...new Set((rooms ?? []).map((room) => room.floor))].sort((a, b) => a - b);
  const occupied = safeByStatus.occupied ?? 0;
  const ready = safeByStatus.available ?? 0;
  const cleaning = safeByStatus.cleaning ?? 0;
  const maintenance = safeByStatus.maintenance ?? 0;
  const totalRooms = safeDash.totalRooms ?? 0;
  const occupancy = totalRooms ? Math.round((occupied / totalRooms) * 100) : 0;

  const hotelDate = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: me?.property?.timezone ?? 'Asia/Kolkata',
  }).format(new Date());

  return (
    <div className="space-y-8">
      {/* Search Param Alerts */}
      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300/80 bg-amber-50/90 p-4 text-sm font-medium text-amber-950 shadow-2xs">
          <span className="text-xl">⚠️</span>
          <p>{error}</p>
        </div>
      )}
      {ok && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/80 bg-emerald-50/90 p-4 text-sm font-medium text-emerald-950 shadow-2xs">
          <span className="text-xl">✅</span>
          <p>{ok}</p>
        </div>
      )}

      {/* Header with Quick Actions */}
      <PageHeader
        title="Today's Front Desk"
        eyebrow="Live Operations"
        description={`${hotelDate} · ${me?.property?.name ?? 'Hotel Property'}`}
      >
        <Link
          href="/reservations#new-reservation"
          className={btnCls}
        >
          <span aria-hidden className="text-sm font-bold">+</span>
          New Reservation
        </Link>
        <Link href="/tape-chart" className={btnGhostCls}>
          📊 Tape Chart (Rack)
        </Link>
        <Link href="/billing" className={btnGhostCls}>
          🧾 Cashiering &amp; Folios
        </Link>
      </PageHeader>

      {/* KPI Overview Cards */}
      <section aria-label="Today's hotel metrics" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Live Occupancy
            </p>
            <span className="rounded-full border border-blue-200/80 bg-blue-50/80 px-2.5 py-0.5 text-xs font-semibold text-blue-800 shadow-2xs">
              {occupancy}% Full
            </span>
          </div>
          <p className="mt-2 font-display text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
            {occupied} <span className="text-sm font-medium text-slate-500">/ {safeDash.totalRooms} Rooms</span>
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(4, occupancy))}%` }}
            />
          </div>
        </div>

        <StatCard
          label="Expected Arrivals"
          value={safeDash.arrivalsToday}
          detail="Today's scheduled check-ins"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          }
        />

        <StatCard
          label="Expected Departures"
          value={safeDash.departuresToday}
          detail="Due-outs to settle &amp; inspect"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
        />

        <StatCard
          label="Ready to Sell"
          value={ready}
          detail={`${cleaning} in cleaning · ${maintenance} down`}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </section>

      {/* Room Board Section */}
      <section aria-labelledby="room-board-title" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3">
          <div>
            <h2 id="room-board-title" className="font-display text-lg font-bold tracking-tight text-ink">
              Live Room Board
            </h2>
            <p className="text-xs text-muted">Floor-by-floor real-time room availability</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Legend status="available" label="Ready" count={ready} />
            <Legend status="occupied" label="Occupied" count={occupied} />
            <Legend status="cleaning" label="Cleaning" count={cleaning} />
            <Legend status="maintenance" label="Maintenance" count={maintenance} />
          </div>
        </div>

        {rooms.length === 0 ? (
          <EmptyState
            title="No hotel rooms configured yet"
            description="Create room types and room numbers to start managing live occupancy."
            action={
              <Link href="/rooms" className={`${btnCls} mt-2`}>
                Configure Rooms &amp; Rates
              </Link>
            }
          />
        ) : (
          floors.map((floor) => {
            const floorRooms = rooms.filter((room) => room.floor === floor);
            const floorReady = floorRooms.filter((r) => r.status === 'available').length;
            const floorOccupied = floorRooms.filter((r) => r.status === 'occupied').length;
            const floorCleaning = floorRooms.filter((r) => r.status === 'cleaning').length;

            return (
              <div key={floor} className="space-y-4 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200/80 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-950 shadow-xs">
                      Floor {floor}
                    </span>
                    <span className="text-xs font-bold text-slate-600">
                      {floorRooms.length} {floorRooms.length === 1 ? 'Room' : 'Rooms Total'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-emerald-900 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {floorReady} Ready
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-blue-900 font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      {floorOccupied} Occupied
                    </span>
                    {floorCleaning > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-amber-900 font-bold">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        {floorCleaning} Cleaning
                      </span>
                    )}
                  </div>
                </div>

                {/* Spacious, Highly Readable Room Cards Grid (Max 4 per row, gracefully wraps) */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {floorRooms.map((room) => (
                    <RoomTile
                      key={room.id}
                      number={room.number}
                      type={room.roomType}
                      status={room.status}
                      floor={room.floor}
                    />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function Legend({
  status,
  label,
  count,
}: {
  status: RoomStatus;
  label: string;
  count?: number;
}) {
  const styles: Record<RoomStatus, { dot: string; bg: string; text: string; border: string }> = {
    available: { dot: 'bg-emerald-500', bg: 'bg-emerald-50/80', text: 'text-emerald-900 font-bold', border: 'border-emerald-200/80' },
    occupied: { dot: 'bg-blue-500', bg: 'bg-blue-50/80', text: 'text-blue-900 font-bold', border: 'border-blue-200/80' },
    cleaning: { dot: 'bg-amber-500', bg: 'bg-amber-50/80', text: 'text-amber-900 font-bold', border: 'border-amber-200/80' },
    maintenance: { dot: 'bg-slate-400', bg: 'bg-slate-100/80', text: 'text-slate-800 font-bold', border: 'border-slate-200/80' },
  };
  const s = styles[status];

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${s.bg} ${s.border} ${s.text} shadow-2xs`}>
      <span aria-hidden className={`h-2 w-2 rounded-full shrink-0 ${s.dot}`} />
      <span>{label}</span>
      {count !== undefined && <span className="font-mono text-[11px] font-semibold opacity-70">({count})</span>}
    </span>
  );
}
