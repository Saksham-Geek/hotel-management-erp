'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Nav, type NavItem } from './nav';
import { CustomDropdown } from './dropdown';
import { RolePersonaSwitcher } from './role-persona-switcher';
import { CommandSearchModal } from './command-search-modal';
import { ThemeToggle } from './theme-toggle';

type PropertyOption = { id: string; name: string };
type FormAction = (formData: FormData) => void | Promise<void>;

const pageNames: Record<string, string> = {
  '/dashboard': 'Today at Front Desk',
  '/room-calendar': 'Room Calendar & Availability',
  '/room-calander': 'Room Calendar & Availability',
  '/tape-chart': 'Room Calendar & Availability',
  '/reservations': 'Bookings & Reservations',
  '/rooms': 'Rooms & Floors',
  '/guests': 'Guest Directory & Profiles',
  '/billing': 'Bills & Payments',
  '/housekeeping': 'Housekeeping & Cleaning',
  '/night-audit': 'Daily Closing (Night Audit)',
  '/compliance': 'Police Reports & Govt Form C',
  '/channel-manager': 'Online Booking Channels (OTAs)',
  '/restaurant': 'Restaurant & Dining',
  '/keycards': 'Room Keys & Locks',
  '/marketing': 'Guest Loyalty & Offers',
  '/staff': 'Staff & Roles',
  '/guide': 'Help & Training Guide',
  '/settings': 'Hotel Settings',
  '/super-admin': 'All Hotel Branches',
  '/platform-admin': 'Platform Founder HQ',
  '/upgrade': 'Subscription Plans',
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
  switchRolePreview,
  actualRole,
}: {
  children: ReactNode;
  property: PropertyOption;
  properties: PropertyOption[];
  fullName: string;
  role: string;
  actualRole?: string;
  plan: string | null;
  readOnly: boolean;
  items: NavItem[];
  selectProperty: FormAction;
  createProperty: FormAction;
  logout: FormAction;
  switchRolePreview?: (role: string) => Promise<void>;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const propertyFormRef = useRef<HTMLFormElement>(null);

  // Global Ctrl+K / Cmd+K search listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem('erp.sidebar.collapsed') === 'true');
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Handle Escape key to close mobile navigation
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen]);

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
      {/* Skip to Main Content Link for Keyboard and Screen-Reader Users (WCAG 2.2 AA) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-xl focus:bg-slate-900 focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-xl focus:ring-2 focus:ring-amber-400 focus:outline-none"
      >
        Skip to main content
      </a>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm md:hidden animate-in fade-in-50"
        />
      )}

      {/* Main Sidebar Navigation - Fixed to viewport so it never scrolls away */}
      <aside
        id="app-navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(88vw,330px)] flex-col border-r border-white/[.08] bg-[#080d1a] px-4 py-5 text-white shadow-2xl transition-all duration-200 md:h-screen md:h-dvh md:translate-x-0 ${
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
            ref={propertyFormRef}
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
            <CustomDropdown
              id="sidebar-property"
              name="propertyId"
              defaultValue={property.id}
              size="sm"
              options={properties.map((item) => ({
                value: item.id,
                label: item.name,
              }))}
              onChange={() => {
                setTimeout(() => {
                  propertyFormRef.current?.requestSubmit();
                }, 50);
              }}
              aria-label="Active Property"
            />
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

      {/* Main Content Area - Offset by fixed sidebar width on desktop */}
      <div
        className={`min-w-0 flex-1 transition-all duration-200 ${
          collapsed ? 'md:pl-[84px]' : 'md:pl-[310px] lg:pl-[320px]'
        }`}
      >
        {/* Sticky Top Header */}
        <header className="sticky top-0 z-30 flex min-h-[60px] items-center justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-6 lg:px-8 shadow-[0_1px_2px_rgba(0,0,0,0.02)] dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="app-navigation"
              onClick={() => setMobileOpen(true)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-800 shadow-2xs hover:bg-slate-50 md:hidden transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <MenuIcon />
            </button>
            <button
              type="button"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={toggleCollapsed}
              className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-2xs hover:bg-slate-50 md:grid transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <CollapseIcon collapsed={collapsed} />
            </button>

            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="min-w-0">
              <ol className="flex items-center gap-1.5 sm:gap-2 text-xs font-medium list-none p-0 m-0">
                <li className="text-slate-500 dark:text-slate-400 truncate max-w-[100px] sm:max-w-[180px] lg:max-w-none">{property.name}</li>
                <li className="text-slate-300 dark:text-slate-600 shrink-0" aria-hidden="true">/</li>
                <li className="font-semibold text-slate-900 dark:text-white truncate max-w-[130px] sm:max-w-[220px] lg:max-w-none" aria-current="page">
                  {pageNames[pathname] ?? 'Hotel Operations'}
                </li>
              </ol>
            </nav>
          </div>

          {/* Header Right Actions */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5 lg:gap-3">
            {/* Universal Search (Ctrl + K) Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 sm:px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:border-slate-600"
              title="Click or press Ctrl+K to search any page, room, or action"
            >
              <span>🔍</span>
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden md:inline-block rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-500 border border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600">
                Ctrl K
              </kbd>
            </button>

            {/* Quick ERP Guide & Journeys Pill */}
            <Link
              href="/guide"
              className="hidden xs:inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 sm:px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:border-slate-600"
              title="Click to view SOP, Page Directory & Step-by-Step Journeys"
            >
              <span>📖 <span className="hidden sm:inline">SOP &amp; </span>Journeys</span>
            </Link>

            {/* Live Indian Time & Date Capsule */}
            <span
              suppressHydrationWarning
              className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-medium text-slate-700 shadow-2xs xl:inline-flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" aria-hidden="true" />
              {new Intl.DateTimeFormat('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                timeZone: 'Asia/Kolkata',
              }).format(new Date())}
            </span>

            {/* Tier / Edition Link Capsule */}
            <Link
              href="/upgrade"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 sm:px-3.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <span>{plan === 'enterprise' ? '👑 Enterprise' : plan === 'growth' || plan === 'plus' ? '⚡ Growth' : '🌱 Starter'}<span className="hidden md:inline"> Edition</span></span>
            </Link>

            {/* Role Persona Switcher (RBAC Live Preview) */}
            {switchRolePreview ? (
              <RolePersonaSwitcher
                currentRole={role}
                actualRole={actualRole || 'owner'}
                switchAction={switchRolePreview}
              />
            ) : (
              <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 sm:px-3 py-1 text-xs font-medium capitalize text-slate-700 shadow-2xs sm:inline-flex dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {role.replaceAll('_', ' ')}
              </span>
            )}

            {/* Theme Toggle (Light / Dark Mode) */}
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content Body */}
        <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 focus:outline-none">
          {/* Active Role Preview Announcement Banner */}
          {actualRole && role !== actualRole && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 p-3.5 sm:p-4 text-xs font-medium text-amber-950 shadow-sm dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-600/60 animate-in fade-in-50 duration-200">
              <div className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 place-items-center rounded-xl bg-amber-400 text-slate-950 text-sm font-bold shadow-xs">
                  👁️
                </span>
                <div>
                  <p className="font-bold text-amber-950 dark:text-amber-100">
                    Staff Role Preview Mode Active: Viewing as{' '}
                    <span className="capitalize underline font-black">{role.replaceAll('_', ' ')}</span>
                  </p>
                  <p className="text-[11px] text-amber-800/90 dark:text-amber-300 mt-0.5">
                    Navigation items, financial reports, and settings are strictly filtered according to this staff persona.
                  </p>
                </div>
              </div>

              {switchRolePreview && (
                <button
                  type="button"
                  onClick={() => switchRolePreview('owner')}
                  className="rounded-xl bg-amber-900 text-white px-3 py-1.5 text-xs font-bold hover:bg-amber-950 transition cursor-pointer shadow-xs dark:bg-amber-400 dark:text-slate-950"
                >
                  ✕ Exit Preview (Return to Owner)
                </button>
              )}
            </div>
          )}
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

      {/* Global Command Search Modal */}
      <CommandSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
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
