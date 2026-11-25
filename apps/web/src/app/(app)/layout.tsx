import { redirect } from 'next/navigation';
import { FEATURES } from '@erp/shared';
import { AppShell } from '@/components/app-shell';
import type { NavItem } from '@/components/nav';
import { getEntitlements, getMe } from '@/lib/api';
import { createProperty, logout, selectProperty, switchRolePreviewAction } from '../login/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let me: Awaited<ReturnType<typeof getMe>>;
  let ent: Awaited<ReturnType<typeof getEntitlements>>;
  try {
    [me, ent] = await Promise.all([getMe(), getEntitlements()]);
  } catch (err: any) {
    if (err?.digest?.startsWith('NEXT_REDIRECT')) throw err;
    redirect('/login?error=' + encodeURIComponent('Your session has ended. Please sign in again.'));
  }
  const has = (feature: keyof typeof ent.features) => !!ent.features[feature];
  const isPlatformFounder =
    me.tenant.slug === 'platform-hq' ||
    me.email === 'founder@antigravity-erp.com' ||
    me.email === 'ops@antigravity-erp.com';

  const role = me.role;

  // Role-Based UI Visibility: Only display navigation affordances that the user's role has permission to access
  let featureItems: (NavItem & { feature?: keyof typeof ent.features })[] = [];

  if (role === 'housekeeping') {
    featureItems = [
      { href: '/housekeeping', label: 'Housekeeping & Cleaning', icon: 'housekeeping', feature: FEATURES.HOTEL_HOUSEKEEPING, group: 'Front Desk & Operations' },
      { href: '/guide', label: 'Help & Training Guide', icon: 'guide', group: 'Help & Support' },
    ];
  } else if (role === 'frontdesk') {
    featureItems = [
      { href: '/dashboard', label: 'Today at Front Desk', icon: 'today', group: 'Front Desk & Operations' },
      { href: '/room-calendar', label: 'Room Calendar', icon: 'tape-chart', feature: FEATURES.HOTEL_TAPE_CHART, group: 'Front Desk & Operations' },
      { href: '/reservations', label: 'Bookings & Reservations', icon: 'reservations', feature: FEATURES.HOTEL_RESERVATIONS, group: 'Front Desk & Operations' },
      { href: '/guests', label: 'Guest Directory', icon: 'guests', feature: FEATURES.HOTEL_RESERVATIONS, group: 'Front Desk & Operations' },
      { href: '/billing', label: 'Bills & Payments', icon: 'billing', feature: FEATURES.HOTEL_BILLING, group: 'Front Desk & Operations' },
      { href: '/night-audit', label: 'Daily Closing (Night Audit)', icon: 'night-audit', feature: FEATURES.HOTEL_NIGHT_AUDIT, group: 'Front Desk & Operations' },
      { href: '/housekeeping', label: 'Housekeeping & Cleaning', icon: 'housekeeping', feature: FEATURES.HOTEL_HOUSEKEEPING, group: 'Front Desk & Operations' },
      { href: '/restaurant', label: 'Restaurant & Dining', icon: 'food', feature: FEATURES.HOTEL_RESTAURANT_POS, group: 'Front Desk & Operations' },
      { href: '/banquets', label: 'Banquets & Events', icon: 'banquets', group: 'Front Desk & Operations' },
      { href: '/expenses', label: 'Petty Cash & Expenses', icon: 'expenses', group: 'Front Desk & Operations' },
      { href: '/guide', label: 'Help & Training Guide', icon: 'guide', group: 'Help & Support' },
    ];
  } else {
    // General Manager & Property Owner
    featureItems = [
      { href: '/dashboard', label: 'Today at Front Desk', icon: 'today', group: 'Front Desk & Operations' },
      { href: '/room-calendar', label: 'Room Calendar', icon: 'tape-chart', feature: FEATURES.HOTEL_TAPE_CHART, group: 'Front Desk & Operations' },
      { href: '/reservations', label: 'Bookings & Reservations', icon: 'reservations', feature: FEATURES.HOTEL_RESERVATIONS, group: 'Front Desk & Operations' },
      { href: '/guests', label: 'Guest Directory', icon: 'guests', feature: FEATURES.HOTEL_RESERVATIONS, group: 'Front Desk & Operations' },
      { href: '/billing', label: 'Bills & Payments', icon: 'billing', feature: FEATURES.HOTEL_BILLING, group: 'Front Desk & Operations' },
      { href: '/night-audit', label: 'Daily Closing (Night Audit)', icon: 'night-audit', feature: FEATURES.HOTEL_NIGHT_AUDIT, group: 'Front Desk & Operations' },
      { href: '/housekeeping', label: 'Housekeeping & Cleaning', icon: 'housekeeping', feature: FEATURES.HOTEL_HOUSEKEEPING, group: 'Front Desk & Operations' },
      { href: '/restaurant', label: 'Restaurant & Dining', icon: 'food', feature: FEATURES.HOTEL_RESTAURANT_POS, group: 'Front Desk & Operations' },
      { href: '/banquets', label: 'Banquets & Events', icon: 'banquets', group: 'Front Desk & Operations' },
      { href: '/expenses', label: 'Petty Cash & Expenses', icon: 'expenses', group: 'Front Desk & Operations' },
      // Management & Setup Section (Manager & Owner)
      { href: '/inventory', label: 'Stores & Stock Inventory', icon: 'inventory', group: 'Management & Setup' },
      { href: '/corporate', label: 'Corporate & City Ledger', icon: 'corporate', group: 'Management & Setup' },
      { href: '/channel-manager', label: 'Online Booking Sites (OTAs)', icon: 'channels', feature: FEATURES.HOTEL_CHANNEL_MANAGER, group: 'Management & Setup' },
      { href: '/marketing', label: 'Guest Loyalty & Offers', icon: 'marketing', feature: FEATURES.HOTEL_LOYALTY, group: 'Management & Setup' },
      { href: '/settings', label: 'Hotel Settings', icon: 'settings', group: 'Management & Setup' },
      ...(role === 'owner'
        ? [
            { href: '/income', label: 'Income & Revenue', icon: 'income' as const, group: 'Owner & Business' },
            { href: '/upgrade', label: 'Subscription Plans', icon: 'plans' as const, group: 'Owner & Business' },
          ]
        : []),
      ...(isPlatformFounder
        ? [
            { href: '/platform-admin', label: 'Platform Founder HQ', icon: 'plans' as const, group: 'Owner & Business' },
          ]
        : []),
      { href: '/guide', label: 'Help & Training Guide', icon: 'guide', group: 'Help & Support' },
    ];
  }
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
      switchRolePreview={switchRolePreviewAction}
      actualRole={(me as any).actualRole || 'owner'}
    >
      {children}
    </AppShell>
  );
}
