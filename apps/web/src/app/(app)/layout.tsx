import { FEATURES } from '@erp/shared';
import { AppShell } from '@/components/app-shell';
import type { NavItem } from '@/components/nav';
import { getEntitlements, getMe } from '@/lib/api';
import { createProperty, logout, selectProperty } from '../login/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [me, ent] = await Promise.all([getMe(), getEntitlements()]);
  const has = (feature: keyof typeof ent.features) => !!ent.features[feature];
  const isPlatformFounder =
    me.tenant.slug === 'platform-hq' ||
    me.email === 'founder@antigravity-erp.com' ||
    me.email === 'ops@antigravity-erp.com';

  const featureItems: (NavItem & { feature?: keyof typeof ent.features })[] = [
    { href: '/dashboard', label: 'Today', icon: 'today', group: 'Front Office' },
    { href: '/tape-chart', label: 'Tape Chart', icon: 'tape-chart', feature: FEATURES.HOTEL_TAPE_CHART, group: 'Front Office' },
    { href: '/reservations', label: 'Reservations', icon: 'reservations', feature: FEATURES.HOTEL_RESERVATIONS, group: 'Front Office' },
    { href: '/rooms', label: 'Rooms & Floors', icon: 'rooms', feature: FEATURES.HOTEL_ROOMS, group: 'Front Office' },
    { href: '/guests', label: 'Guests Master', icon: 'guests', feature: FEATURES.HOTEL_RESERVATIONS, group: 'Front Office' },
    { href: '/billing', label: 'Billing & Folios', icon: 'billing', feature: FEATURES.HOTEL_BILLING, group: 'Finance & Compliance' },
    { href: '/night-audit', label: 'Night Audit', icon: 'night-audit', feature: FEATURES.HOTEL_NIGHT_AUDIT, group: 'Finance & Compliance' },
    { href: '/compliance', label: 'Statutory BoI & Police', icon: 'compliance', feature: FEATURES.HOTEL_COMPLIANCE, group: 'Finance & Compliance' },
    { href: '/housekeeping', label: 'Housekeeping', icon: 'housekeeping', feature: FEATURES.HOTEL_HOUSEKEEPING, group: 'Operations & Growth' },
    { href: '/channel-manager', label: 'OTA Channel Manager', icon: 'channels', feature: FEATURES.HOTEL_CHANNEL_MANAGER, group: 'Operations & Growth' },
    { href: '/marketing', label: 'Marketing & CRM', icon: 'marketing', feature: FEATURES.HOTEL_LOYALTY, group: 'Operations & Growth' },
    ...(me.role === 'owner' || me.role === 'manager'
      ? [{ href: '/staff', label: 'Staff & Hierarchy', icon: 'staff' as const, group: 'Executive & Admin' }]
      : []),
    ...(me.role === 'owner'
      ? [
          { href: '/income', label: 'Owner Income & Revenue', icon: 'income' as const, group: 'Executive & Admin' },
          { href: '/super-admin', label: 'Multi-Hotel Console', icon: 'admin' as const, group: 'Executive & Admin' },
        ]
      : []),
    ...(isPlatformFounder
      ? [
          { href: '/platform-admin', label: 'SaaS Founder HQ (MRR)', icon: 'plans' as const, group: 'Executive & Admin' },
        ]
      : []),
    { href: '/upgrade', label: 'Plans & Pricing', icon: 'plans', group: 'Executive & Admin' },
    { href: '/guide', label: 'SOP & Master Guide', icon: 'guide', group: 'Executive & Admin' },
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
