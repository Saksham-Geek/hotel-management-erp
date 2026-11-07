import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { Banner, PageHeader } from '@/components/ui';
import { api, getMe, getEntitlements } from '@/lib/api';
import { SettingsView } from './settings-view';
import type { RoomRecord, RoomTypeRecord } from '../rooms/room-inventory';
import type { OutletDto, TableDto, MenuCategoryDto } from '../restaurant/restaurant-pos-view';

export default async function SettingsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string; ok?: string }>;
}) {
  const me = await getMe();

  // Role Gate: Settings & Management Hub is strictly restricted to Manager or Owner level
  if (me.role !== 'owner' && me.role !== 'manager') {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent(
          'Access Restricted: Property Management & Settings Hub is reserved for General Managers and Property Owners.',
        ),
    );
  }

  const [{ tab, error, ok }, ent] = await Promise.all([searchParams, getEntitlements()]);

  // Fetch live counts and operational configurations across all modules
  const [rooms, types, tables, outlets, menu, upiSettings, terminals, channelData, users, keycards] =
    await Promise.all([
      api<RoomRecord[]>('/hotel/rooms').catch(() => []),
      api<RoomTypeRecord[]>('/hotel/room-types').catch(() => []),
      api<TableDto[]>('/hotel/restaurant/tables').catch(() => []),
      api<OutletDto[]>('/hotel/restaurant/outlets').catch(() => []),
      api<MenuCategoryDto[]>('/hotel/restaurant/menu').catch(() => []),
      api<{ upiId: string; upiMerchantName: string; propertyName: string; isOwner: boolean }>(
        '/hotel/upi-settings',
      ).catch(() => null),
      api<any[]>('/hotel/pos/terminals').catch(() => []),
      api<any>('/hotel/channels').catch(() => ({ channels: [], stats: { otaBookingsCount: 0 } })),
      api<any[]>('/users').catch(() => []),
      api<any[]>('/hotel/keycards/keys').catch(() => []),
    ]);

  return (
    <>
      <PageHeader
        title="Settings &amp; Management Hub"
        eyebrow="Administrative Control Center"
        description="Unified configuration console to manage rooms, dining floor plans, bank UPI settlements, OTA channel distribution, and staff roles."
      />
      <Banner error={error} ok={ok} />

      <SettingsView
        initialTab={tab || 'all'}
        role={me.role}
        property={me.property}
        rooms={rooms}
        types={types}
        tables={tables}
        outlets={outlets}
        menu={menu}
        upiSettings={upiSettings}
        terminals={terminals}
        channelData={channelData}
        users={users}
        keycards={keycards}
        readOnly={ent.readOnly}
      />
    </>
  );
}
