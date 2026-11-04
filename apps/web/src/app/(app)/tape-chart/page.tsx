import { FEATURES } from '@erp/shared';
import { Banner, PageHeader } from '@/components/ui';
import { api, getMe, requireFeature } from '@/lib/api';
import { TapeChartView, type ReservationTape, type RoomTape } from './tape-chart-view';

interface TapeChartData {
  startDate: string;
  days: number;
  rooms: RoomTape[];
  reservations: ReservationTape[];
}

export default async function TapeChartPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; days?: string; error?: string; ok?: string }>;
}) {
  const [{ startDate, days, error, ok }, ent, me] = await Promise.all([
    searchParams,
    requireFeature(FEATURES.HOTEL_TAPE_CHART),
    getMe(),
  ]);

  const query = new URLSearchParams();
  if (startDate) query.set('startDate', startDate);
  if (days) query.set('days', days);

  const data = await api<TapeChartData>(`/hotel/tape-chart?${query.toString()}`).catch(() => ({
    startDate: startDate ?? new Date().toISOString().slice(0, 10),
    days: 7,
    rooms: [],
    reservations: [],
  }));

  return (
    <>
      <PageHeader
        title="Room Rack / Tape Chart"
        eyebrow="Front Desk Timeline"
        description="Interactive visual Gantt chart of room inventory, active stays, and room statuses across properties."
      />
      <Banner error={error} ok={ok} />

      <TapeChartView
        initialStartDate={data.startDate}
        rooms={data.rooms ?? []}
        reservations={data.reservations ?? []}
        currency={me.property?.currency ?? 'INR'}
      />
    </>
  );
}
