import { FEATURES } from '@erp/shared';
import { Nav, type NavItem } from '@/components/nav';
import { getEntitlements, getMe } from '@/lib/api';
import { createProperty, logout, selectProperty } from '../login/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [me, ent] = await Promise.all([getMe(), getEntitlements()]);
  const has = (f: keyof typeof FEATURES | string) => !!ent.features[f as keyof typeof ent.features];

  // Menu entries follow the plan. Features outside the plan stay visible as "Upgrade" so people know they exist.
  const items: NavItem[] = [
    { href: '/dashboard', label: 'Today' },
    { href: '/rooms', label: 'Rooms', locked: !has(FEATURES.HOTEL_ROOMS) },
    { href: '/reservations', label: 'Reservations', locked: !has(FEATURES.HOTEL_RESERVATIONS) },
    { href: '/guests', label: 'Guests', locked: !has(FEATURES.HOTEL_RESERVATIONS) },
    { href: '/housekeeping', label: 'Housekeeping', locked: !has(FEATURES.HOTEL_HOUSEKEEPING) },
  ].map((i) => (i.locked ? { ...i, href: `/upgrade?feature=${featureFor(i.href)}` } : i));

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col gap-5 bg-ink px-4 py-5 text-white md:sticky md:top-0 md:h-screen md:w-64 md:gap-8 md:px-5 md:py-7">
        <div>
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-bold">{me.property.name.slice(0,1).toUpperCase()}</span><div className="min-w-0"><p className="truncate font-display text-lg font-bold leading-tight">{me.property.name}</p><p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-white/45">Hotel operations</p></div></div>
          <p className="mt-1 text-xs text-white/60">{ent.plan ? `${ent.plan[0].toUpperCase()}${ent.plan.slice(1)} plan` : 'No active plan'}</p>
        </div>
        {me.properties.length > 1 && (
          <form action={selectProperty} className="space-y-2">
            <label className="block text-xs text-white/65" htmlFor="active-property">Property</label>
            <select id="active-property" name="propertyId" defaultValue={me.property.id} className="w-full rounded-md bg-white px-2 py-2 text-sm text-ink">
              {me.properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}
            </select>
            <button className="text-xs text-white/80 underline">Switch property</button>
          </form>
        )}
        {me.role === 'owner' && (
          <form action={createProperty} className="space-y-2 border-t border-white/10 pt-4">
            <label className="block text-xs text-white/65" htmlFor="new-property-name">Add property</label>
            <input id="new-property-name" name="name" required minLength={2} maxLength={120} placeholder="Property name" className="w-full rounded-md px-2 py-2 text-sm text-ink" />
            <button className="text-xs text-white/80 underline">Create and open</button>
          </form>
        )}
        <Nav items={items} />
        <form action={logout} className="mt-auto">
          <p className="mb-2 truncate text-xs text-white/60">{me.fullName}</p>
          <button className="text-sm text-white/80 underline-offset-4 hover:text-white hover:underline">Sign out</button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8 xl:px-10">
        {ent.readOnly && (
          <p role="status" className="mb-6 rounded-md border border-brass/40 bg-brass/10 px-4 py-3 text-sm text-brass">
            Your subscription needs attention. You can view everything but not make changes until it is renewed.
          </p>
        )}
        {children}
      </main>
    </div>
  );
}

function featureFor(href: string) {
  return { '/rooms': FEATURES.HOTEL_ROOMS, '/reservations': FEATURES.HOTEL_RESERVATIONS, '/guests': FEATURES.HOTEL_RESERVATIONS, '/housekeeping': FEATURES.HOTEL_HOUSEKEEPING }[href] ?? '';
}
