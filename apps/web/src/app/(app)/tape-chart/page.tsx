import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { Banner, btnCls, btnGhostCls, PageHeader } from '@/components/ui';
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
  const me = await getMe();
  if (me.role === 'housekeeping') {
    redirect(
      '/housekeeping?error=' +
        encodeURIComponent(
          'Access Restricted: Tape Chart is reserved for Front Desk and Management.',
        ),
    );
  }

  const [{ startDate, days, error, ok }, ent] = await Promise.all([
    searchParams,
    requireFeature(FEATURES.HOTEL_TAPE_CHART),
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
        title="Room Rack &amp; Tape Chart"
        eyebrow="Front Desk Gantt Timeline"
        description="Multi-day visual room allocation, continuous reservation ribbons, and 1-click cashiering folios."
      >
        <Link
          href="/reservations#new-reservation"
          className={btnCls}
        >
          <span aria-hidden className="text-sm font-bold">+</span>
          New Reservation
        </Link>
        <Link href="/billing" className={btnGhostCls}>
          🧾 Cashiering &amp; Folios
        </Link>
        <Link href="/dashboard" className={btnGhostCls}>
          📋 Today's Desk
        </Link>
      </PageHeader>
      <Banner error={error} ok={ok} />

      <TapeChartView
        initialStartDate={data.startDate}
        initialDays={data.days ?? (days ? parseInt(days, 10) : 7)}
        rooms={data.rooms ?? []}
        reservations={data.reservations ?? []}
        currency={me.property?.currency ?? 'INR'}
      />
    </>
  );
}
