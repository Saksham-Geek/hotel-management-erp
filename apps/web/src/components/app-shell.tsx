'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Nav, type NavItem } from './nav';

type PropertyOption = { id: string; name: string };
type FormAction = (formData: FormData) => void | Promise<void>;

const pageNames: Record<string, string> = {
  '/dashboard': 'Today & Front Desk',
  '/tape-chart': 'Room Rack (Tape Chart)',
  '/reservations': 'Reservations & Stays',
  '/rooms': 'Rooms & Floor Configuration',
  '/guests': 'Guests & Identity Records',
  '/billing': 'Cashiering & GST Invoicing',
  '/housekeeping': 'Housekeeping Board',
  '/night-audit': 'Night Audit & Manager KPIs',
  '/compliance': 'Police Beat & BoI Form C',
  '/channel-manager': 'OTA Channel Manager & Distribution',
  '/upgrade': 'Subscription Plans & Tiers',
  '/profile': 'My Staff Profile',
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

  const initials = fullName
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const tierBadge =
    plan === 'enterprise'
      ? { label: 'Taj Chain', color: 'bg-amber-400/25 text-amber-200 border-amber-400/50' }
      : plan === 'growth' || plan === 'plus'
      ? { label: 'Growth', color: 'bg-teal-400/25 text-teal-200 border-teal-400/50' }
      : { label: 'Starter', color: 'bg-white/15 text-white border-white/30' };

  return (
    <div className="min-h-dvh md:flex bg-ground">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden animate-in fade-in-50"
        />
      )}

      {/* Main Sidebar Navigation */}
      <aside
        id="app-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(84vw,300px)] flex-col border-r border-white/[.08] bg-[#0c1427] px-3.5 py-4 text-white shadow-2xl transition-all duration-200 md:sticky md:top-0 md:z-20 md:h-dvh md:translate-x-0 md:px-4 md:py-5 ${
          collapsed ? 'md:w-[78px]' : 'md:w-[270px]'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand / Property Header */}
        <div className={`flex min-h-12 items-center gap-3 px-1.5 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-400/25 to-teal-600/10 text-teal-400 ring-1 ring-teal-400/30 shadow-inner"
            aria-hidden
          >
            <HotelMark />
          </div>
          <div className={`${collapsed ? 'md:hidden' : ''} min-w-0 flex-1`}>
            <p className="truncate font-display text-sm font-bold tracking-tight text-white">
              {property.name}
            </p>
            <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[.18em] text-teal-400/80">
              Hotel Operations PMS
            </p>
          </div>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-2 text-white/60 hover:bg-white/10 md:hidden"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Multi-Property Switcher */}
        {properties.length > 1 && (
          <form
            action={selectProperty}
            className={`mt-4 rounded-xl border border-white/[.08] bg-white/[.04] p-2.5 ${
              collapsed ? 'md:hidden' : ''
            }`}
          >
            <label
              htmlFor="sidebar-property"
              className="mb-1 block text-[9px] font-bold uppercase tracking-[.18em] text-white/40"
            >
              Active Property
            </label>
            <select
              id="sidebar-property"
              name="propertyId"
              defaultValue={property.id}
              className="h-8 w-full rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-medium text-white focus:border-teal-400 focus:outline-none"
            >
              {properties.map((item) => (
                <option className="text-ink" key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button className="mt-1.5 w-full rounded-md py-1 text-center text-[11px] font-semibold text-teal-300 hover:bg-white/5">
              Switch property
            </button>
          </form>
        )}

        {/* Navigation Items (Grouped) */}
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
          <Nav items={items} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
        </div>

        {/* Add Property Action for Owners */}
        {role === 'owner' && (
          <div className={`border-t border-white/[.08] pt-3 ${collapsed ? 'md:hidden' : ''}`}>
            <button
              type="button"
              onClick={() => setAddPropertyOpen((open) => !open)}
              aria-expanded={addPropertyOpen}
              className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-white/60 hover:bg-white/[.06] hover:text-white transition-colors"
            >
              {addPropertyOpen ? '✕ Cancel' : '+ Add hotel property'}
            </button>
            {addPropertyOpen && (
              <form action={createProperty} className="mt-2 space-y-2 px-1">
                <label htmlFor="new-property-name" className="sr-only">
                  New property name
                </label>
                <input
                  id="new-property-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder="e.g. Sea Breeze Resort"
                  className="h-9 w-full rounded-xl border border-white/15 bg-white px-3 text-xs text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <button className="h-8 w-full rounded-xl bg-teal-500 px-3 text-xs font-bold text-slate-950 hover:bg-teal-400 transition-colors">
                  Create and switch
                </button>
              </form>
            )}
          </div>
        )}

        {/* User Profile Bar */}
        <div
          className={`mt-3 flex items-center gap-3 border-t border-white/[.08] px-1.5 pt-3.5 ${
            collapsed ? 'md:justify-center md:px-0' : ''
          }`}
        >
          <Link
            href="/profile"
            title="My profile and contact details"
            className={`group flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1.5 outline-none transition-colors hover:bg-white/[.06] focus-visible:ring-2 focus-visible:ring-teal-400 ${
              collapsed ? 'md:flex-none md:justify-center' : ''
            }`}
          >
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-xs font-extrabold text-slate-950 shadow-sm"
              aria-hidden
            >
              {initials}
            </div>
            <div className={`${collapsed ? 'md:hidden' : ''} min-w-0 flex-1`}>
              <p className="truncate text-xs font-bold text-white/95 group-hover:text-white">
                {fullName}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className="capitalize text-[10px] font-semibold text-white/50">
                  {role.replaceAll('_', ' ')}
                </span>
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${tierBadge.color}`}
                >
                  {tierBadge.label}
                </span>
              </div>
            </div>
          </Link>

          <form action={logout} className={collapsed ? 'md:hidden' : ''}>
            <button
              aria-label="Sign out"
              title="Sign out"
              className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              <SignOutIcon />
            </button>
          </form>
          {collapsed && (
            <form action={logout} className="hidden md:block">
              <button
                aria-label="Sign out"
                title="Sign out"
                className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
              >
                <SignOutIcon />
              </button>
            </form>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1">
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 flex min-h-[64px] items-center justify-between gap-4 border-b border-line/80 bg-surface/85 px-4 backdrop-blur-md sm:px-6 lg:px-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="app-navigation"
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-ink shadow-sm hover:bg-ground md:hidden transition-colors"
            >
              <MenuIcon />
            </button>
            <button
              type="button"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggleCollapsed}
              className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl border border-line bg-surface text-muted shadow-sm hover:bg-ground md:grid transition-colors"
            >
              <CollapseIcon collapsed={collapsed} />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-muted">{property.name}</span>
                <span className="text-line" aria-hidden>/</span>
                <span className="font-bold text-ink">{pageNames[pathname] ?? 'Hotel Operations'}</span>
              </div>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex shrink-0 items-center gap-3">
            {/* Live Indian Time & Date Capsule */}
            <span className="hidden items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 py-1 text-xs font-bold text-slate-800 shadow-xs lg:inline-flex">
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30 animate-pulse shrink-0" />
              {new Intl.DateTimeFormat('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              }).format(new Date())}
            </span>

            {/* Tier / Edition Link Capsule */}
            <Link
              href="/upgrade"
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-xs font-black shadow-xs transition-all hover:scale-105 ${
                plan === 'enterprise'
                  ? 'border-amber-400 bg-amber-100 text-amber-950'
                  : plan === 'growth' || plan === 'plus'
                  ? 'border-teal-400 bg-teal-100 text-teal-950'
                  : 'border-slate-300 bg-slate-100 text-slate-900'
              }`}
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-teal-600 shrink-0" />
              <span>{plan === 'enterprise' ? '👑 Taj Chain' : plan === 'growth' || plan === 'plus' ? '⚡ Growth' : '🌱 Starter'}</span>
              <span className="hidden sm:inline">Edition</span>
            </Link>

            <span className="hidden rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-900 sm:inline-flex">
              {role.replaceAll('_', ' ')}
            </span>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {readOnly && (
            <div
              role="status"
              className="mb-6 flex items-start gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-xs font-medium text-ink shadow-sm"
            >
              <span
                className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-warning/20 text-xs font-bold text-amber-800"
                aria-hidden
              >
                !
              </span>
              <p>
                <strong className="font-bold">Read-only mode:</strong> Your property subscription requires attention.
                Data can be inspected, but charges, check-ins, and modifications are paused.
              </p>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}

function HotelMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V6.5L12 3l8 3.5V20M2.5 20h19M8 8v2M12 8v2M16 8v2M8 13v2M12 13v7M16 13v2" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10M14 8l4 4-4 4M8 12h10" />
    </svg>
  );
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`h-5 w-5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4" width="17" height="16" rx="2" />
      <path d="M9 4v16M14 9l-3 3 3 3" />
    </svg>
  );
}
