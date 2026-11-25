import { FEATURES } from '@erp/shared';
import { Banner, PageHeader } from '@/components/ui';
import { api, requireFeature } from '@/lib/api';
import { HousekeepingClient, type HousekeepingRoom, type HousekeepingLog, type MinibarItem } from './housekeeping-client';

export default async function Housekeeping({ searchParams }: { searchParams: Promise<{ error?: string; ok?: string }> }) {
  const [{ error, ok }, ent] = await Promise.all([searchParams, requireFeature(FEATURES.HOTEL_HOUSEKEEPING)]);

  let rooms: HousekeepingRoom[] = [];
  try {
    rooms = await api<HousekeepingRoom[]>('/hotel/rooms');
  } catch {
    rooms = [];
  }

  let logs: HousekeepingLog[] = [];
  try {
    logs = await api<HousekeepingLog[]>('/hotel/rooms/housekeeping/logs');
  } catch {
    logs = [];
  }

  let minibarCatalog: MinibarItem[] = [];
  try {
    minibarCatalog = await api<MinibarItem[]>('/hotel/rooms/minibar/catalog');
  } catch {
    minibarCatalog = [];
  }

  return (
    <>
      <PageHeader
        title="Housekeeping & Room Turnaround"
        eyebrow="Operations Hub"
        description="Mobile-ready attendant workspace for 1-tap room turnaround, maintenance defect ticketing, and minibar guest billing."
      />
      <Banner error={error} ok={ok} />
      <HousekeepingClient
        rooms={rooms}
        logs={logs}
        minibarCatalog={minibarCatalog}
        readOnly={ent.readOnly}
      />
    </>
  );
}
