import { FEATURES } from '@erp/shared';
import { AppShell } from '@/components/app-shell';
import type { NavItem } from '@/components/nav';
import { getEntitlements, getMe } from '@/lib/api';
import { createProperty, logout, selectProperty } from '../login/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [me, ent] = await Promise.all([getMe(), getEntitlements()]);
  const has = (feature: keyof typeof ent.features) => !!ent.features[feature];
  const featureItems: (NavItem & { feature?: keyof typeof ent.features })[] = [
    { href: '/dashboard', label: 'Today', icon: 'today', group: 'Front Desk' },
    { href: '/tape-chart', label: 'Tape Chart', icon: 'tape-chart', feature: FEATURES.HOTEL_TAPE_CHART, group: 'Front Desk' },
    { href: '/reservations', label: 'Reservations', icon: 'reservations', feature: FEATURES.HOTEL_RESERVATIONS, group: 'Front Desk' },
    { href: '/rooms', label: 'Rooms', icon: 'rooms', feature: FEATURES.HOTEL_ROOMS, group: 'Front Desk' },
    { href: '/guests', label: 'Guests', icon: 'guests', feature: FEATURES.HOTEL_RESERVATIONS, group: 'Front Desk' },
    { href: '/billing', label: 'Billing & Folios', icon: 'billing', feature: FEATURES.HOTEL_BILLING, group: 'Finance & GST' },
    { href: '/night-audit', label: 'Night Audit', icon: 'night-audit', feature: FEATURES.HOTEL_NIGHT_AUDIT, group: 'Finance & GST' },
    { href: '/housekeeping', label: 'Housekeeping', icon: 'housekeeping', feature: FEATURES.HOTEL_HOUSEKEEPING, group: 'Operations' },
    { href: '/compliance', label: 'Compliance & BoI', icon: 'compliance', feature: FEATURES.HOTEL_COMPLIANCE, group: 'Operations' },
    { href: '/channel-manager', label: 'OTA Channel Manager', icon: 'channels', feature: FEATURES.HOTEL_CHANNEL_MANAGER, group: 'Distribution' },
    { href: '/upgrade', label: 'Plans & Pricing', icon: 'plans', group: 'Platform' },
    ...(me.role === 'owner'
      ? [{ href: '/super-admin', label: 'Super Admin (HQ)', icon: 'admin' as const, group: 'HQ & Governance' }]
      : []),
  ];
  const items = featureItems.map((item) => {
    if (!item.feature || has(item.feature)) return item;
    const { feature: _feature, ...navItem } = item;
    return { ...navItem, href: `/upgrade?feature=${encodeURIComponent(item.feature)}`, locked: true };
  });

  return (
    <AppShell
      property={me.property}
      properties={me.properties}
      fullName={me.fullName}
      role={me.role}
      plan={ent.plan}
      readOnly={ent.readOnly}
      items={items}
      selectProperty={selectProperty}
      createProperty={createProperty}
      logout={logout}
    >
      {children}
    </AppShell>
  );
}
