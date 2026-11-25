import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { Banner, PageHeader } from '@/components/ui';
import { api, getMe, getEntitlements } from '@/lib/api';
import {
  SettingsView,
  type RoomRecord,
  type RoomTypeRecord,
  type OutletDto,
  type TableDto,
  type MenuCategoryDto,
} from './settings-view';

export default async function SettingsHubPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string; ok?: string }>;
}) {
  const [
    me,
    { tab, error, ok },
    ent,
    rooms,
    types,
    tables,
    outlets,
    menu,
    upiSettings,
    terminals,
    channelData,
    users,
    keycards,
    keySystemSettings,
    expenseCategories,
    vendors,
    venues,
    rawMaterials,
    corporateAccounts,
    conciergeSettings,
    commonExpenses,
    inventoryCategories,
    nightAuditSchedule,
    chartOfAccounts,
    recipesOverview,
    minibarCatalog,
    dynamicPricingRules,
    housekeepingLogs,
  ] = await Promise.all([
    getMe(),
    searchParams,
    getEntitlements(),
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
    api<any>('/users').catch(() => ({ staff: [] })),
    api<any[]>('/hotel/keycards/keys').catch(() => []),
    api<{ keySystemMode: 'brass_only' | 'rfid_only' | 'hybrid'; enableMobileQr: boolean }>(
      '/hotel/keycards/settings',
    ).catch(() => ({ keySystemMode: 'hybrid' as const, enableMobileQr: true })),
    api<any[]>('/hotel/expenses/categories').catch(() => []),
    api<any[]>('/hotel/expenses/vendors').catch(() => []),
    api<any[]>('/hotel/banquets/venues').catch(() => []),
    api<any[]>('/hotel/restaurant/inventory/raw-materials').catch(() => []),
    api<any[]>('/hotel/billing/corporate-accounts').catch(() => []),
    api<any>('/hotel/expenses/concierge-settings').catch(() => ({
      wifiSsid: 'GrandAzure_Guest_5G',
      wifiPassword: 'Welcome2026!',
      receptionPhone: '+91 98765 43210',
      receptionWhatsapp: '+91 98765 43210',
      breakfastTiming: '7:00 AM - 10:30 AM (Coral Cafe)',
      poolTiming: '6:00 AM - 8:00 PM',
      gymTiming: '24 Hours (Keycard Access)',
      googleReviewUrl: 'https://maps.google.com',
    })),
    api<any[]>('/hotel/expenses/common-items').catch(() => []),
    api<any[]>('/hotel/restaurant/inventory/categories').catch(() => []),
    api<{ autoAuditEnabled: boolean; autoAuditTime: string; autoAuditLastRunAt?: string | null }>(
      '/hotel/night-audit/schedule-settings',
    ).catch(() => ({ autoAuditEnabled: false, autoAuditTime: '02:00', autoAuditLastRunAt: null })),
    api<any[]>('/hotel/accounting/chart-of-accounts').catch(() => []),
    api<any[]>('/hotel/restaurant/inventory/recipes-overview').catch(() => []),
    api<any[]>('/hotel/rooms/minibar/catalog').catch(() => []),
    api<any[]>('/hotel/rooms/pricing-rules').catch(() => []),
    api<any[]>('/hotel/rooms/housekeeping/logs').catch(() => []),
  ]);

  const staffList = Array.isArray(users) ? users : (users?.staff ?? []);

  // Role Gate: Settings & Management Hub is strictly restricted to Manager or Owner level
  if (me.role !== 'owner' && me.role !== 'manager') {
    redirect(
      '/dashboard?error=' +
        encodeURIComponent(
          'Access Restricted: Property Management & Settings Hub is reserved for General Managers and Property Owners.',
        ),
    );
  }

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
        users={staffList}
        keycards={keycards}
        keySystemSettings={keySystemSettings}
        expenseCategories={expenseCategories}
        vendors={vendors}
        venues={venues}
        rawMaterials={rawMaterials}
        corporateAccounts={corporateAccounts}
        conciergeSettings={conciergeSettings}
        commonExpenses={commonExpenses}
        inventoryCategories={inventoryCategories}
        nightAuditSchedule={nightAuditSchedule}
        chartOfAccounts={chartOfAccounts}
        recipesOverview={recipesOverview}
        minibarCatalog={minibarCatalog}
        dynamicPricingRules={dynamicPricingRules}
        housekeepingLogs={housekeepingLogs}
        readOnly={ent.readOnly}
      />
    </>
  );
}
