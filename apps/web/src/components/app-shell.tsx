'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Nav, type NavItem } from './nav';

type PropertyOption = { id: string; name: string };
type FormAction = (formData: FormData) => void | Promise<void>;

const pageNames: Record<string, string> = {
  '/dashboard': 'Today',
  '/rooms': 'Rooms',
  '/reservations': 'Reservations',
  '/guests': 'Guests',
  '/housekeeping': 'Housekeeping',
  '/upgrade': 'Plan and access',
};

export function AppShell({
  children,
  property,
  properties,
  fullName,
  role,
  plan,
  readOnly,
  items,
  selectProperty,
  createProperty,
  logout,
}: {
  children: ReactNode;
  property: PropertyOption;
  properties: PropertyOption[];
  fullName: string;
  role: string;
  plan: string | null;
  readOnly: boolean;
  items: NavItem[];
  selectProperty: FormAction;
  createProperty: FormAction;
  logout: FormAction;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('erp.sidebar.collapsed') === 'true');
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      window.localStorage.setItem('erp.sidebar.collapsed', String(!value));
      return !value;
    });
  }

  return (
    <div className="min-h-dvh md:flex">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] md:hidden"
        />
      )}

      <aside
        id="app-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,300px)] flex-col border-r border-white/10 bg-[#142c40] px-3 py-4 text-white transition-[width,transform] duration-200 md:sticky md:top-0 md:z-20 md:h-dvh md:translate-x-0 md:px-3 md:py-5 ${
          collapsed ? 'md:w-[76px]' : 'md:w-[260px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        <div className={`flex min-h-12 items-center gap-3 px-2 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#20b7a8]/15 text-[#20b7a8]" aria-hidden>
            <HotelMark />
          </div>
          <div className={`${collapsed ? 'md:hidden' : ''} min-w-0 flex-1`}>
            <p className="truncate text-sm font-semibold tracking-tight">{property.name}</p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[.15em] text-white/45">Hotel operations</p>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-md p-2 text-white/65 hover:bg-white/10 md:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        {properties.length > 1 && (
          <form action={selectProperty} className={`mt-5 border-t border-white/10 pt-4 ${collapsed ? 'md:hidden' : ''}`}>
            <label htmlFor="sidebar-property" className="mb-1.5 block px-2 text-[10px] font-semibold uppercase tracking-[.14em] text-white/45">Property</label>
            <select id="sidebar-property" name="propertyId" defaultValue={property.id} className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-xs text-white focus:border-teal-300 focus:outline-none">
              {properties.map((item) => <option className="text-ink" key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-xs font-medium text-[#20b7a8] hover:bg-white/5">Switch property</button>
          </form>
        )}

        <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
          <Nav items={items} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
        </div>

        {role === 'owner' && (
          <div className={`border-t border-white/10 pt-3 ${collapsed ? 'md:hidden' : ''}`}>
            <button type="button" onClick={() => setAddPropertyOpen((open) => !open)} aria-expanded={addPropertyOpen} className="w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-white/65 hover:bg-white/[.06] hover:text-white">
              {addPropertyOpen ? 'Cancel adding property' : '+ Add property'}
            </button>
            {addPropertyOpen && (
              <form action={createProperty} className="mt-2 space-y-2 px-1">
                <label htmlFor="new-property-name" className="sr-only">New property name</label>
                <input id="new-property-name" name="name" required minLength={2} maxLength={120} placeholder="Property name" className="h-9 w-full rounded-lg border border-white/15 bg-white px-3 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal-300" />
                <button className="h-9 w-full rounded-lg bg-sidebar-accent px-3 text-xs font-semibold text-primary hover:brightness-95">Create and open</button>
              </form>
            )}
          </div>
        )}

        <div className={`mt-3 flex items-center gap-3 border-t border-white/10 px-2 pt-4 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white/90" aria-hidden>
            {fullName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className={`${collapsed ? 'md:hidden' : ''} min-w-0 flex-1`}>
            <p className="truncate text-xs font-semibold text-white/90">{fullName}</p>
            <p className="mt-0.5 capitalize text-[10px] text-white/45">{role.replaceAll('_', ' ')}{plan ? ` · ${plan} plan` : ''}</p>
          </div>
          <form action={logout} className={collapsed ? 'md:hidden' : ''}>
            <button aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white">
              <SignOutIcon />
            </button>
          </form>
          {collapsed && <form action={logout} className="hidden md:block"><button aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white"><SignOutIcon /></button></form>}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-[60px] items-center justify-between gap-3 border-b border-line/80 bg-ground/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="app-navigation" onClick={() => setMobileOpen(true)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-ink shadow-sm hover:bg-ground md:hidden">
              <MenuIcon />
            </button>
            <button type="button" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={toggleCollapsed} className="hidden h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted shadow-sm hover:bg-ground md:grid">
              <CollapseIcon collapsed={collapsed} />
            </button>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted" aria-label="Current location">{property.name}<span className="px-1.5 text-line" aria-hidden> / </span><span className="font-semibold text-ink">{pageNames[pathname] ?? 'Hotel operations'}</span></p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {properties.length > 1 && (
              <form action={selectProperty} className="hidden items-center gap-2 sm:flex">
                <label htmlFor="header-property" className="sr-only">Current property</label>
                <select id="header-property" name="propertyId" defaultValue={property.id} className="h-9 max-w-48 rounded-lg border border-line bg-surface px-2 text-xs font-medium text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring)/.2)]">
                  {properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
                <button className="rounded-lg px-2 py-2 text-xs font-semibold text-primary hover:bg-white">Switch</button>
              </form>
            )}
            <span className="hidden rounded-full border border-line bg-surface px-2.5 py-1 text-[10px] font-medium capitalize text-muted sm:inline-flex">{role.replaceAll('_', ' ')}</span>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6 sm:py-7 lg:px-8 lg:py-8">
          {readOnly && (
            <div role="status" className="mb-6 flex items-start gap-3 rounded-xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-ink">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-warning/15 text-xs font-bold text-warning" aria-hidden>!</span>
              <p><span className="font-semibold">Read-only mode.</span> Your subscription needs attention. You can view property data, but changes are paused until it is renewed.</p>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function HotelMark() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20V6.5L12 3l8 3.5V20M2.5 20h19M8 8v2M12 8v2M16 8v2M8 13v2M12 13v7M16 13v2" /></svg>;
}

function MenuIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}

function SignOutIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10M14 8l4 4-4 4M8 12h10" /></svg>;
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M9 4v16M14 9l-3 3 3 3" /></svg>;
}
