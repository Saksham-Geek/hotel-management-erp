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
  '/marketing': 'Guest Follow-Up & Loyalty CRM',
  '/staff': 'Staff Hierarchy & Delegation',
  '/guide': 'Hotel ERP SOP & User Journeys',
  '/super-admin': 'Multi-Hotel Portfolio Console',
  '/platform-admin': 'SaaS Founder HQ & Revenue',
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
      ? { label: 'Enterprise Edition', color: 'bg-amber-400/25 text-amber-200 border-amber-400/50' }
      : plan === 'growth' || plan === 'plus'
      ? { label: 'Growth Edition', color: 'bg-teal-400/25 text-teal-200 border-teal-400/50' }
      : { label: 'Starter Edition', color: 'bg-white/15 text-white border-white/30' };

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
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,330px)] flex-col border-r border-white/[.08] bg-[#080d1a] px-4 py-5 text-white shadow-2xl transition-all duration-200 md:sticky md:top-0 md:z-20 md:h-dvh md:translate-x-0 ${
          collapsed ? 'md:w-[84px] md:px-3' : 'md:w-[310px] lg:w-[320px] md:px-5'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Brand / Property Header */}
        <div className={`flex min-h-12 items-center gap-3.5 px-1 ${collapsed ? 'md:justify-center md:px-0' : ''}`}>
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/10 text-white ring-1 ring-white/15 shadow-sm"
            aria-hidden
          >
            <HotelMark />
          </div>
          <div className={`${collapsed ? 'md:hidden' : ''} min-w-0 flex-1`}>
            <p className="truncate font-display text-[15px] font-bold tracking-tight text-white leading-tight">
              {property.name}
            </p>
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
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
            className={`mt-4 rounded-xl border border-white/10 bg-white/[.04] p-2.5 backdrop-blur-xs ${
              collapsed ? 'md:hidden' : ''
            }`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="sidebar-property"
                className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
              >
                Active Property
              </label>
            </div>
            <select
              id="sidebar-property"
              name="propertyId"
              defaultValue={property.id}
              onChange={(e) => e.target.form?.requestSubmit()}
              className="h-8.5 w-full rounded-lg border border-white/15 bg-slate-900/90 px-2.5 text-xs font-semibold text-white focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors cursor-pointer"
            >
              {properties.map((item) => (
                <option className="text-ink bg-white font-medium" key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </form>
        )}

        {/* Navigation Items (Grouped) */}
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1.5 custom-scrollbar">
          <Nav items={items} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
        </div>

        {/* Add Property Action for Owners */}
        {role === 'owner' && (
          <div className={`border-t border-white/[.08] pt-3.5 ${collapsed ? 'md:hidden' : ''}`}>
            <button
              type="button"
              onClick={() => setAddPropertyOpen((open) => !open)}
              aria-expanded={addPropertyOpen}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs font-bold text-slate-300 hover:bg-white/[.08] hover:text-white transition-colors"
            >
              <span>{addPropertyOpen ? '✕ Cancel' : '+ Add hotel property'}</span>
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
          className={`mt-3 flex items-center gap-3 border-t border-white/[.08] px-1 pt-3.5 ${
            collapsed ? 'md:justify-center md:px-0' : ''
          }`}
        >
          <Link
            href="/profile"
            title="My profile and contact details"
            className={`group flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1.5 outline-none transition-all hover:bg-white/[.08] focus-visible:ring-2 focus-visible:ring-white/20 ${
              collapsed ? 'md:flex-none md:justify-center' : ''
            }`}
          >
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-800 text-xs font-bold text-white ring-1 ring-white/15 shadow-sm"
              aria-hidden
            >
              {initials}
            </div>
            <div className={`${collapsed ? 'md:hidden' : ''} min-w-0 flex-1 text-left`}>
              <p className="truncate text-[13.5px] font-semibold text-white group-hover:text-slate-200 transition-colors">
                {fullName}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5 flex-wrap">
                <span className="capitalize text-[11px] font-medium text-slate-400">
                  {role.replaceAll('_', ' ')}
                </span>
                <span
                  className="inline-flex rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-300"
                >
                  {tierBadge.label}
                </span>
              </div>
            </div>
          </Link>

          {!collapsed && (
            <form action={logout}>
              <button
                type="submit"
                aria-label="Sign out"
                title="Sign out of this session"
                className="rounded-xl p-2.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
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
        <header className="sticky top-0 z-30 flex min-h-[60px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="app-navigation"
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xs hover:bg-slate-50 md:hidden transition-colors"
            >
              <MenuIcon />
            </button>
            <button
              type="button"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggleCollapsed}
              className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs hover:bg-slate-50 md:grid transition-colors"
            >
              <CollapseIcon collapsed={collapsed} />
            </button>

            {/* Breadcrumb Navigation */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium">
                <span className="text-slate-500">{property.name}</span>
                <span className="text-slate-300" aria-hidden>/</span>
                <span className="font-semibold text-slate-900">{pageNames[pathname] ?? 'Hotel Operations'}</span>
              </div>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            {/* Quick ERP Guide & Journeys Pill */}
            <Link
              href="/guide"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors"
              title="Click to view SOP, Page Directory & Step-by-Step Journeys"
            >
              <span>📖 SOP & Journeys</span>
            </Link>

            {/* Live Indian Time & Date Capsule */}
            <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-slate-700 shadow-2xs lg:inline-flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
              {new Intl.DateTimeFormat('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              }).format(new Date())}
            </span>

            {/* Tier / Edition Link Capsule */}
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              <span>{plan === 'enterprise' ? '👑 Taj Chain Edition' : plan === 'growth' || plan === 'plus' ? '⚡ Growth Edition' : '🌱 Starter Edition'}</span>
            </Link>

            <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium capitalize text-slate-700 shadow-2xs sm:inline-flex">
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
