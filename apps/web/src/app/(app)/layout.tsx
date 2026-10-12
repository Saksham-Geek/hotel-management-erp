import { FEATURES } from '@erp/shared';
import { AppShell } from '@/components/app-shell';
import type { NavItem } from '@/components/nav';
import { getEntitlements, getMe } from '@/lib/api';
import { createProperty, logout, selectProperty } from '../login/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [me, ent] = await Promise.all([getMe(), getEntitlements()]);
  const has = (feature: keyof typeof ent.features) => !!ent.features[feature];
  const featureItems: (NavItem & { feature?: keyof typeof ent.features })[] = [
    { href: '/dashboard', label: 'Today', icon: 'today' },
    { href: '/rooms', label: 'Rooms', icon: 'rooms', feature: FEATURES.HOTEL_ROOMS },
    { href: '/reservations', label: 'Reservations', icon: 'reservations', feature: FEATURES.HOTEL_RESERVATIONS },
    { href: '/guests', label: 'Guests', icon: 'guests', feature: FEATURES.HOTEL_RESERVATIONS },
    { href: '/housekeeping', label: 'Housekeeping', icon: 'housekeeping', feature: FEATURES.HOTEL_HOUSEKEEPING },
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
