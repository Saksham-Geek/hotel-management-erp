'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

interface GuideViewProps {
  userRole: string;
  userEmail: string;
  userName: string;
  tenantSlug: string;
  propertyName: string;
  isPlatformFounder: boolean;
}

export function GuideView({
  userRole,
  userEmail,
  userName,
  tenantSlug,
  propertyName,
  isPlatformFounder,
}: GuideViewProps) {
  // Determine default tab based on the active user's authenticated access level
  const initialTab = useMemo(() => {
    if (isPlatformFounder) return 'founder';
    if (userRole === 'owner') return 'owner';
    if (userRole === 'manager') return 'manager';
    if (userRole === 'housekeeping') return 'housekeeping';
    return 'frontdesk';
  }, [userRole, isPlatformFounder]);

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [pageRoleFilter, setPageRoleFilter] = useState<string>('all');

  // Complete modern route inventory
  const allPages = [
    {
      route: '/dashboard',
      name: "Today's Front Desk",
      badge: 'Front Office',
      minRole: 'frontdesk',
      rolesAllowed: ['frontdesk', 'manager', 'owner', 'founder'],
      desc: 'The operational nerve center of the hotel. Live visual room rack grouped by floor with real-time status pills (Available, Occupied, Cleaning, Maintenance). Shows expected arrivals, departures, and sellable inventory.',
      actions: ['Instant walk-in check-in', 'Monitor live occupancy %', 'Track floor turnover status', 'Access quick folio billing'],
      icon: '📋',
    },
    {
      route: '/tape-chart',
      name: 'Room Rack (Tape Chart)',
      badge: 'Front Office',
      minRole: 'frontdesk',
      rolesAllowed: ['frontdesk', 'manager', 'owner', 'founder'],
      desc: 'Interactive multi-day visual Gantt chart timeline with drag-to-select booking. Shows continuous reservation ribbons color-coded by channel (Walk-In, MMT, Booking.com, Agoda, Corporate). Connects directly to guest folios.',
      actions: ['Drag-to-select stay dates & instant booking', 'Multi-day allocation overview', 'Inspect booking ribbons by OTA channel', '1-click jump to guest cashiering folio'],
      icon: '📊',
    },
    {
      route: '/reservations',
      name: 'Reservations & Stays',
      badge: 'Front Office',
      minRole: 'frontdesk',
      rolesAllowed: ['frontdesk', 'manager', 'owner', 'founder'],
      desc: 'Complete booking ledger. Handles advance direct reservations, walk-ins, hourly day-use stays, cancellations, and stay modifications.',
      actions: ['Create new booking', 'Modify stay dates', 'Cancel reservation with audit log', 'Filter by stay status'],
      icon: '🛎️',
    },
    {
      route: '/rooms',
      name: 'Rooms & Floor Inventory',
      badge: 'Front Office',
      minRole: 'manager',
      rolesAllowed: ['manager', 'owner', 'founder'],
      desc: 'Physical room and tariff master. Setup floors, room categories (Deluxe, Executive Suite, Palace Suite), base tariffs, and maximum guest capacities.',
      actions: ['Add room types and base tariffs', 'Configure individual room numbers', 'Set hourly day-use rates', 'Inspect floor capacity distribution'],
      icon: '🚪',
    },
    {
      route: '/guests',
      name: 'Guests Master & CRM',
      badge: 'Front Office',
      minRole: 'frontdesk',
      rolesAllowed: ['frontdesk', 'manager', 'owner', 'founder'],
      desc: 'Centralized guest identity records with AES-256-GCM encryption, masked Aadhaar (UIDAI last-4 digits rule), passport details, and returning guest loyalty history.',
      actions: ['Search guest profiles', 'Verify government identity documents', 'Link travel companions', 'Inspect lifetime stay count and spend'],
      icon: '👤',
    },
    {
      route: '/billing',
      name: 'Cashiering, Folios & Indian GST',
      badge: 'Finance & GST',
      minRole: 'frontdesk',
      rolesAllowed: ['frontdesk', 'manager', 'owner', 'founder'],
      desc: 'Comprehensive billing folios with automated Indian GST dual-slab calculation (12% for tariff <= ₹7,500; 18% for tariff > ₹7,500). Enforces Section 269ST ₹2L cash limits, Rule 114B PAN validation, dynamic NPCI Scan-to-Pay UPI QR codes with countdown timer, 1-click WhatsApp tax invoice dispatch, and Owner-exclusive receiver UPI ID bank configuration.',
      actions: ['Dynamic NPCI scan-to-pay QR generator', 'Owner-only receiver UPI ID configuration', '1-click WhatsApp GST invoice dispatch', 'Enforce Section 269ST ₹2L cash guard'],
      icon: '💳',
    },
    {
      route: '/book/[slug]',
      name: 'Direct Guest Booking Engine',
      badge: 'Distribution & Direct',
      minRole: 'frontdesk',
      rolesAllowed: ['frontdesk', 'manager', 'owner', 'founder'],
      desc: 'Commission-free, mobile-first public booking portal for guests. Bypasses 18-25% OTA commissions. Guests view real-time availability, select stay dates, enter guest particulars, and confirm reservations instantly with direct advance UPI deposits.',
      actions: ['0% commission direct reservations', 'Public mobile-responsive stay booking', 'Instant advance UPI QR deposit flow', 'Direct injection into Tape Chart rack'],
      icon: '🏨',
    },
    {
      route: '/night-audit',
      name: 'Night Audit & Manager KPIs',
      badge: 'Finance & Operations',
      minRole: 'manager',
      rolesAllowed: ['manager', 'owner', 'founder'],
      desc: 'Automated end-of-day rollover engine. Advances operational business date, posts daily room charges to active folios, reconciles cashier drawers, and computes RevPAR, ADR, and occupancy metrics.',
      actions: ['Execute 1-click Night Audit rollover', 'Generate Daily Manager Revenue Report', 'Reconcile room statuses', 'Track historical ADR & RevPAR trends'],
      icon: '🌙',
    },
    {
      route: '/compliance',
      name: 'Statutory BoI & Police Beat',
      badge: 'Statutory Compliance',
      minRole: 'frontdesk',
      rolesAllowed: ['frontdesk', 'manager', 'owner', 'founder'],
      desc: 'Mandatory Indian statutory compliance engine. Direct Bureau of Immigration (BoI) Form C filing for foreign national guests within 24 hours of arrival, and daily local police beat station register export.',
      actions: ['File BoI Form C for foreign passports', 'Export daily police station beat register', 'Enforce Section 269ST cash compliance', 'Validate guest PAN under Rule 114B'],
      icon: '⚖️',
    },
    {
      route: '/housekeeping',
      name: 'Housekeeping Board',
      badge: 'Operations',
      minRole: 'housekeeping',
      rolesAllowed: ['housekeeping', 'frontdesk', 'manager', 'owner', 'founder'],
      desc: 'Real-time room turnover board. Floor attendants mark rooms from Cleaning to Inspected to Available once turned down, prioritizing expected arrivals.',
      actions: ['Update room cleaning status', 'Flag rooms under maintenance', 'Prioritize turnover for incoming guests', 'Log room inspection notes'],
      icon: '🧹',
    },
    {
      route: '/channel-manager',
      name: 'OTA Channel Manager & ARI',
      badge: 'Distribution',
      minRole: 'manager',
      rolesAllowed: ['manager', 'owner', 'founder'],
      desc: 'Two-way integration engine for MakeMyTrip, Booking.com, Agoda, Expedia, and Airbnb. Synchronizes live inventory, rates, and availability (ARI) and ingests incoming OTA bookings automatically.',
      actions: ['Manage OTA channel credentials', 'Simulate live OTA booking ingestion', 'Push real-time ARI availability', 'Inspect webhook sync audit logs'],
      icon: '🌐',
    },
    {
      route: '/marketing',
      name: 'Guest Follow-Up & Loyalty CRM',
      badge: 'Marketing & CRM',
      minRole: 'frontdesk',
      rolesAllowed: ['frontdesk', 'manager', 'owner', 'founder'],
      desc: 'Luxury hotel marketing automation. Sends automated post-checkout WhatsApp review requests (Google Reviews & TripAdvisor), manages Taj InnerCircle loyalty tiers, tracks VIP preferences, and dispatches repeat booking campaigns.',
      actions: ['1-click WhatsApp Google review outreach', 'Track lifetime guest spend & nights', 'Log guest preferences (pillows, floor, dietary)', 'Broadcast targeted seasonal promotions'],
      icon: '💬',
    },
    {
      route: '/staff',
      name: 'Staff & Hierarchy Delegation',
      badge: 'HQ & Governance',
      minRole: 'manager',
      rolesAllowed: ['manager', 'owner', 'founder'],
      desc: 'Enterprise multi-tier organizational tree. Enforces delegation hierarchy: Owners appoint GMs, and GMs provision Front Desk and Housekeeping staff. Supports shift assignments and account credential toggles.',
      actions: ['Appoint General Managers', 'Provision Front Desk & Housekeeping logins', 'Assign staff to morning/evening/night shifts', 'Enforce role delegation boundaries'],
      icon: '👥',
    },
    {
      route: '/income',
      name: 'Owner Income & Revenue Analytics',
      badge: 'Executive & Admin',
      minRole: 'owner',
      rolesAllowed: ['owner', 'founder'],
      desc: 'Confidential executive financial intelligence system. Provides interactive P&L analytics, rolling daily, weekly, monthly, quarterly, 6-month, and annual turnover, interactive SVG revenue graphs, USALI departmental breakdown, and tax compliance auditing.',
      actions: ['Audit daily, monthly, and annual gross vs net income', 'Interactive SVG revenue timeline graphs', 'USALI Rooms vs F&B vs Ancillary split', 'Track OTA commissions vs Direct bookings', '1-click Print Board Pack P&L Statement'],
      icon: '📈',
    },
    {
      route: '/super-admin',
      name: 'Multi-Hotel Portfolio Console',
      badge: 'HQ & Governance',
      minRole: 'owner',
      rolesAllowed: ['owner', 'founder'],
      desc: 'Centralized chain-level management for multi-hotel owners. Switch context between different hotels in your portfolio (e.g. Mumbai Palace vs Ganges), review aggregate key counts, and provision new property branches.',
      actions: ['Switch between hotel properties in 1 click', 'Inspect multi-hotel capacity and rooms', 'Add additional hotel properties to organization'],
      icon: '🏢',
    },
    ...(isPlatformFounder
      ? [
          {
            route: '/platform-admin',
            name: 'SaaS Founder HQ & Revenue',
            badge: 'Platform Super-Admin',
            minRole: 'founder',
            rolesAllowed: ['founder'],
            desc: 'Central SaaS command center for the software founder and operations team. Tracks Monthly Recurring Revenue (MRR), ARR, lifetime software earnings, all client hotels, subscription plan switcher, and churn retention ledger.',
            actions: ['Monitor platform MRR & ARR', 'Manage client hotel subscriptions', 'Clean-slate hotel onboarding', 'Track churned hotels & reasons'],
            icon: '⚡',
          },
        ]
      : []),
    {
      route: '/upgrade',
      name: 'Plans & Subscription Billing',
      badge: 'Executive & Admin',
      minRole: 'owner',
      rolesAllowed: ['owner', 'founder'],
      desc: 'View current hospitality tier (Starter, Growth, Enterprise Chain) and feature entitlements. Upgrade plan, view monthly software billing amount, and unlock advanced features.',
      actions: ['Inspect plan room and user limits', 'Review unlocked ERP features', 'Request tier upgrades'],
      icon: '💎',
    },
  ];

  // Filter pages by role if requested
  const filteredPages = useMemo(() => {
    if (pageRoleFilter === 'all') return allPages;
    return allPages.filter((p) => p.rolesAllowed.includes(pageRoleFilter));
  }, [allPages, pageRoleFilter]);

  const roleMeta: Record<string, { label: string; badgeCls: string; icon: string; desc: string }> = {
    founder: {
      label: 'SaaS Platform Founder & Staff',
      badgeCls: 'bg-slate-900 text-white border-slate-700',
      icon: '⚡',
      desc: 'Master software administrator governing platform subscription MRR/ARR, tenant lifecycles, and cloud operations.',
    },
    owner: {
      label: 'Hotel Property Owner / Director',
      badgeCls: 'bg-amber-100 text-amber-950 border-amber-300',
      icon: '👑',
      desc: 'Asset owner overseeing hotel P&L profitability, multi-hotel property switching, and leadership delegation.',
    },
    manager: {
      label: 'General Manager (GM) / Operations Lead',
      badgeCls: 'bg-blue-100 text-blue-950 border-blue-300',
      icon: '👔',
      desc: 'Operational director managing staff shifts, OTA channel distribution, night audit reconciliation, and guest delight.',
    },
    frontdesk: {
      label: 'Front Desk Executive & Cashier',
      badgeCls: 'bg-emerald-100 text-emerald-950 border-emerald-300',
      icon: '🛎️',
      desc: 'Reception agent operating live check-ins, tape chart allocations, cashiering with Indian GST, and BoI Form C.',
    },
    housekeeping: {
      label: 'Housekeeping & Floor Attendant',
      badgeCls: 'bg-teal-100 text-teal-950 border-teal-300',
      icon: '🧹',
      desc: 'Turndown and room maintenance specialist managing room cleaning states and priority arrivals turnover.',
    },
  };

  const currentRoleKey = isPlatformFounder ? 'founder' : userRole;
  const currentMeta = roleMeta[currentRoleKey] ?? roleMeta.frontdesk;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 shadow-2xs">
              Standard Operating Procedures (SOP)
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {propertyName}
            </span>
          </div>

          {/* Active User Access Level Chip */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Your Access Level:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wider shadow-2xs ${currentMeta.badgeCls}`}
            >
              <span>{currentMeta.icon}</span>
              <span>{currentMeta.label}</span>
            </span>
          </div>
        </div>

        <h1 className="mt-3 font-display text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Hospitality ERP Master Guide &amp; SOP Handbook
        </h1>
        <p className="mt-2 text-sm sm:text-base font-normal text-slate-600 max-w-4xl leading-relaxed">
          Official operational procedures and module permissions tailored to your authenticated access level. Use this manual to execute daily workflows, train hotel staff, and uphold statutory compliance.
        </p>
      </div>

      {/* Role-Based Access Awareness Card */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentMeta.icon}</span>
            <h3 className="text-base font-black text-slate-950 font-display">
              Logged in as {userName} ({currentMeta.label})
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
            {currentMeta.desc} The handbook below highlights procedures authorized for your role while allowing you to inspect subordinate staff workflows for cross-departmental coordination.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab(currentRoleKey)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-bold shadow-xs hover:bg-slate-800 transition-all cursor-pointer"
          >
            <span>Jump to My Role SOP ({currentMeta.label.split(' ')[0]})</span>
            <span>➔</span>
          </button>
        </div>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="flex flex-wrap p-1 bg-slate-100 rounded-2xl border border-slate-200/80 gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('pages')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'pages'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          📖 Which Page is For What ({allPages.length} Modules)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('matrix')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'matrix'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          🔐 Role Permissions Matrix
        </button>

        {isPlatformFounder && (
          <button
            type="button"
            onClick={() => setActiveTab('founder')}
            className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'founder'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-700 hover:text-slate-950 font-black'
            }`}
          >
            ⚡ SaaS Platform Founder SOP
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('owner')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'owner'
              ? 'bg-amber-100 text-amber-950 shadow-xs border border-amber-300'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          👑 Hotel Owner &amp; Director SOP
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('manager')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'manager'
              ? 'bg-blue-100 text-blue-950 shadow-xs border border-blue-300'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          👔 General Manager (GM) SOP
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('frontdesk')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'frontdesk'
              ? 'bg-emerald-100 text-emerald-950 shadow-xs border border-emerald-300'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          🛎️ Front Desk &amp; Cashiering SOP
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('housekeeping')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'housekeeping'
              ? 'bg-teal-100 text-teal-950 shadow-xs border border-teal-300'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          🧹 Housekeeping &amp; Turndown SOP
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: Which Page is For What (Module Directory) */}
      {/* ========================================================= */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm font-medium text-slate-700">
              Browse modules below or filter by access level to see which pages each staff member can operate:
            </p>

            {/* Filter by Role */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-500">Filter:</span>
              {[
                { key: 'all', label: 'All Modules' },
                { key: 'frontdesk', label: 'Front Desk' },
                { key: 'housekeeping', label: 'Housekeeping' },
                { key: 'manager', label: 'GM' },
                { key: 'owner', label: 'Owner Only' },
              ].map((rf) => (
                <button
                  key={rf.key}
                  type="button"
                  onClick={() => setPageRoleFilter(rf.key)}
                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    pageRoleFilter === rf.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredPages.map((p) => {
              const isAllowedForMe = p.rolesAllowed.includes(currentRoleKey);
              return (
                <Link
                  key={p.route}
                  href={p.route}
                  className={`group flex flex-col justify-between rounded-3xl border p-6 transition-all duration-200 ${
                    isAllowedForMe
                      ? 'border-slate-200 bg-white shadow-xs hover:border-slate-950 hover:shadow-md'
                      : 'border-slate-200/70 bg-slate-50/60 opacity-80'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-3xl">{p.icon}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-slate-700">
                          {p.badge}
                        </span>
                        {isAllowedForMe ? (
                          <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            ✓ Unlocked
                          </span>
                        ) : (
                          <span className="rounded-lg bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            🔒 Higher Tier
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-4 font-display text-lg font-black text-slate-950 group-hover:text-indigo-900 transition-colors">
                      {p.name}
                    </h3>
                    <p className="mt-0.5 text-xs font-mono text-indigo-700 font-bold">{p.route}</p>
                    <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed">{p.desc}</p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                    <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                      Key Capabilities:
                    </p>
                    <ul className="text-xs text-slate-800 space-y-1">
                      {p.actions.map((act, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="text-emerald-600 font-black">✓</span>
                          <span className="font-medium">{act}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: Role Permissions Matrix */}
      {/* ========================================================= */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs">
            <h2 className="font-display text-xl sm:text-2xl font-black text-slate-950">
              Role-Based Access Control (RBAC) Authority Matrix
            </h2>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed font-normal">
              Every operation and route is enforced cryptographically at the PostgreSQL Row Level Security (RLS) layer and verified on the server via NestJS Guards.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 font-black uppercase tracking-wider text-slate-700">
                  <tr>
                    <th className="px-5 py-3.5">ERP Module / Operational Capability</th>
                    <th className="px-4 py-3.5 text-center">Housekeeping</th>
                    <th className="px-4 py-3.5 text-center">Front Desk</th>
                    <th className="px-4 py-3.5 text-center">General Manager</th>
                    <th className="px-4 py-3.5 text-center">Hotel Owner</th>
                    <th className="px-4 py-3.5 text-center bg-slate-900 text-white">SaaS Founder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">Room Turnover &amp; Cleaning Statuses (`/housekeeping`)</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A (Platform)</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">Live Rack &amp; Front Desk Arrivals (`/dashboard`)</td>
                    <td className="px-4 py-3 text-center text-slate-400">View Only</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">Gantt Tape Chart Drag-to-Select (`/tape-chart`)</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">Cashiering, Folios &amp; GST Invoicing (`/billing`)</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">Dynamic Scan-to-Pay NPCI UPI QR &amp; WhatsApp Invoicing</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A</td>
                  </tr>
                  <tr className="bg-amber-50/50">
                    <td className="px-5 py-3 font-bold text-amber-950">
                      Configure Receiver UPI ID / Bank VPA (Settlement Authority)
                    </td>
                    <td className="px-4 py-3 text-center text-rose-500 font-bold">Locked</td>
                    <td className="px-4 py-3 text-center text-slate-500 font-semibold">🔒 Read-Only</td>
                    <td className="px-4 py-3 text-center text-slate-500 font-semibold">🔒 Read-Only</td>
                    <td className="px-4 py-3 text-center text-amber-800 font-black">👑 Owner Exclusive (403 Gated)</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A (Property Bank)</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">Direct Guest Booking Engine (`/book/[slug]`)</td>
                    <td className="px-4 py-3 text-center text-slate-500 font-semibold">View Only</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-emerald-600 font-bold">Live Portal</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">BoI Form C Foreign Registration (`/compliance`)</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">OTA Channel Manager &amp; Sync (`/channel-manager`)</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-slate-400">View Only</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">Night Audit Rollover &amp; Manager KPIs (`/night-audit`)</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-slate-400">View Only</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Access</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">Staff Hierarchy &amp; Shifts Management (`/staff`)</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">FD &amp; HK Only</td>
                    <td className="px-4 py-3 text-center text-emerald-700 font-black">Full Hierarchy</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">Owner Income &amp; P&amp;L Intelligence (`/income`)</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-amber-700 font-black">👑 Owner Only</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A</td>
                  </tr>
                  <tr>
                    <td className="px-5 py-3 font-bold text-slate-950">Multi-Hotel Portfolio Switcher (`/super-admin`)</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-amber-700 font-black">👑 Owner Only</td>
                    <td className="px-4 py-3 text-center bg-slate-50 text-slate-400">N/A</td>
                  </tr>
                  <tr className="bg-slate-50/80">
                    <td className="px-5 py-3 font-bold text-indigo-950">SaaS Platform Founder HQ (MRR) (`/platform-admin`)</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-rose-500">Locked</td>
                    <td className="px-4 py-3 text-center text-rose-500 font-bold">Locked (Customer)</td>
                    <td className="px-4 py-3 text-center bg-slate-900 text-emerald-400 font-black">⚡ Founder Only</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: SaaS Platform Founder SOP (Strictly Founder Only) */}
      {/* ========================================================= */}
      {activeTab === 'founder' && isPlatformFounder && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="rounded-3xl border border-slate-900 bg-slate-950 text-white p-6 sm:p-7 shadow-lg">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-0.5 text-xs font-black uppercase tracking-wider">
                Internal Console Only
              </span>
            </div>
            <h2 className="mt-2 font-display text-xl sm:text-2xl font-black text-white">
              SaaS Platform Founder &amp; Operations Command SOP
            </h2>
            <p className="mt-1 text-sm text-slate-300 leading-relaxed font-normal">
              Confidential operational procedures for managing your software company: tracking monthly recurring revenue (MRR), ARR, onboarding client hotels, managing subscription statuses, and monitoring churn.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black text-slate-950">
                  Procedure 1: Monitoring Software Recurring Revenue (MRR &amp; ARR)
                </h3>
                <Link href="/platform-admin" className="text-xs font-bold text-indigo-600 hover:underline">
                  Open Founder HQ ➔
                </Link>
              </div>
              <ul className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <li>• Navigate to <strong className="text-slate-950">/platform-admin</strong>.</li>
                <li>• Inspect top-level cards: <strong className="text-slate-950">Monthly Recurring Revenue (MRR)</strong> (sum of all active monthly client fees: Starter ₹1,999, Growth ₹5,999, Enterprise ₹19,999) and <strong className="text-slate-950">Annual Run-Rate (ARR)</strong>.</li>
                <li>• Review <strong className="text-slate-950">Lifetime Platform Income</strong> which reconciles all historical Razorpay / bank invoices collected in the platform ledger.</li>
                <li>• Monitor <strong className="text-slate-950">SaaS Net Churn %</strong> to measure retention across client hotel properties.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black text-slate-950">
                  Procedure 2: Client Subscription Management &amp; Tier Changes
                </h3>
                <Link href="/platform-admin" className="text-xs font-bold text-indigo-600 hover:underline">
                  Client Directory ➔
                </Link>
              </div>
              <ul className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <li>• In the Client Directory table, search by hotel organization name, code, or owner email.</li>
                <li>• Use the <strong className="text-slate-950">Plan Switcher dropdown</strong> to upgrade a hotel (e.g. from Growth ₹5,999 to Enterprise ₹19,999) when their room volume or multi-property cluster expands.</li>
                <li>• If an invoice payment is past due or a client pauses operations, click <strong className="text-rose-700 font-bold">Suspend</strong> to lock operational writes while preserving their data.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black text-slate-950">
                  Procedure 3: Fresh-Start Clean Slate Onboarding for New Clients
                </h3>
                <Link href="/onboard" className="text-xs font-bold text-emerald-700 hover:underline">
                  Open Self-Service Onboarding ➔
                </Link>
              </div>
              <ul className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <li>• Direct prospective hoteliers to the public onboarding wizard at <strong className="text-slate-950">/onboard</strong>.</li>
                <li>• Choose between <strong className="text-slate-950">Option A: Clean Blank Slate (0 Rooms)</strong> (starts with 0 dummy bookings and 0 dummy rooms for custom property configurations) or <strong className="text-slate-950">Option B: Quick Starter Inventory</strong>.</li>
                <li>• Onboarding automatically creates the PostgreSQL tenant, property context, initial subscription invoice, and logs the hotel owner into their dashboard immediately.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: Hotel Owner & Director SOP */}
      {/* ========================================================= */}
      {activeTab === 'owner' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6 sm:p-7 shadow-xs">
            <h2 className="font-display text-xl sm:text-2xl font-black text-amber-950">
              Hotel Property Owner &amp; Managing Director SOP
            </h2>
            <p className="mt-1 text-sm text-amber-900 leading-relaxed font-medium">
              Standard Operating Procedures for hotel asset owners, directors, and hospitality group investors overseeing financial yield, multi-hotel switching, and leadership delegation.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black text-slate-950">
                  SOP 1: Confidential Hotel Income &amp; P&amp;L Analytics
                </h3>
                <Link href="/income" className="text-xs font-bold text-amber-900 hover:underline">
                  Open Owner Income ➔
                </Link>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <p>• Navigate to <strong className="text-slate-950">/income</strong> (restricted strictly to Property Owners).</p>
                <p>• Select time horizons: <strong className="text-slate-950">Daily, Weekly (7d), Monthly (30d), Quarterly (3m), 6 Months, 1 Year, Annual Financial Year (FY), or Custom Date Range</strong>.</p>
                <p>• Audit USALI revenue departments: Rooms gross/net revenue vs Food &amp; Beverage (F&amp;B) vs Ancillary services (Spa/Laundry).</p>
                <p>• Review hotel health KPIs: <strong className="text-slate-950">Average Daily Rate (ADR)</strong>, <strong className="text-slate-950">Revenue Per Available Room (RevPAR)</strong>, and Occupancy %.</p>
                <p>• Click <strong className="text-slate-950">"Print Board Pack"</strong> to produce a formal formatted P&amp;L statement for your chartered accountant or investor review.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black text-slate-950">
                  SOP 2: Multi-Hotel Property Cluster Switching
                </h3>
                <Link href="/super-admin" className="text-xs font-bold text-amber-900 hover:underline">
                  Open Multi-Hotel Console ➔
                </Link>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <p>• If you own multiple hotels (e.g. Vikram Singhania owning Heritage Haveli Jaipur and Lakeview Resort Udaipur), open <strong className="text-slate-950">/super-admin</strong>.</p>
                <p>• Click <strong className="text-slate-950">"Switch to Hotel"</strong> on any property card.</p>
                <p>• The entire ERP instantly switches to that hotel property with zero data contamination.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black text-slate-950">
                  SOP 3: Appointing Leadership &amp; Delegating Operational Roles
                </h3>
                <Link href="/staff" className="text-xs font-bold text-amber-900 hover:underline">
                  Open Staff Hierarchy ➔
                </Link>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <p>• Open <strong className="text-slate-950">/staff</strong>.</p>
                <p>• Appoint your <strong className="text-slate-950">General Manager (GM)</strong> who will direct day-to-day front desk and housekeeping teams.</p>
                <p>• Owners retain supreme administrative authority to reset staff passwords, reassign roles, and configure property room rates at <strong className="text-slate-950">/rooms</strong>.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-300 bg-amber-50/40 p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-200 text-amber-950 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    Owner Exclusive
                  </span>
                  <h3 className="font-display text-lg font-black text-slate-950">
                    SOP 4: Receiver UPI ID &amp; Bank Settlement VPA Configuration
                  </h3>
                </div>
                <Link href="/billing" className="text-xs font-bold text-amber-950 hover:underline">
                  Open Billing &amp; UPI Settings ➔
                </Link>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <p>• Open <strong className="text-slate-950">/billing</strong>. Notice the top banner showing the active receiving Virtual Payment Address (VPA) and registered merchant name.</p>
                <p>• Click <strong className="text-slate-950">"Configure Receiving Account"</strong> to open the secure banking modal.</p>
                <p>• Enter your official hotel bank UPI ID (e.g. <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-900 font-bold font-mono">tajhotels@icici</code> or <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200 text-amber-900 font-bold font-mono">hotelier@okhdfcbank</code>) and registered trade merchant name.</p>
                <p>• <strong className="text-amber-950 font-bold">Cryptographic Access Guard:</strong> Only users with the <strong className="text-slate-950">Owner</strong> role are permitted to execute this update. General Managers, Front Desk Receptionists, and Housekeeping staff have read-only visibility and receive a strict <code className="bg-rose-100 text-rose-800 px-1 py-0.5 rounded font-mono text-xs font-bold">403 Forbidden</code> error if attempting changes. This guarantees complete protection against unauthorized diversion of hotel cashiering and direct booking deposits.</p>
                <p>• Once saved, this VPA immediately updates the dynamic NPCI QR codes across cashiering folios and powers the public direct guest booking engine.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: General Manager SOP */}
      {/* ========================================================= */}
      {activeTab === 'manager' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-6 sm:p-7 shadow-xs">
            <h2 className="font-display text-xl sm:text-2xl font-black text-blue-950">
              General Manager (GM) &amp; Operations Lead SOP
            </h2>
            <p className="mt-1 text-sm text-blue-900 leading-relaxed font-medium">
              Operational handbook for General Managers overseeing staff shifts, OTA rate parity, end-of-day night audit, and guest relationship management.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black text-slate-950">
                  GM SOP 1: Morning Briefing &amp; Live Room Rack Review
                </h3>
                <Link href="/dashboard" className="text-xs font-bold text-blue-800 hover:underline">
                  Open Today's Board ➔
                </Link>
              </div>
              <ul className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <li>• At 08:00 hrs, open <strong className="text-slate-950">/dashboard</strong> to inspect expected arrivals, departures, and current occupancy %.</li>
                <li>• Verify floor turndown statuses with the Executive Housekeeper on <strong className="text-slate-950">/housekeeping</strong>.</li>
                <li>• Inspect <strong className="text-slate-950">/tape-chart</strong> to spot vacant room gaps across the upcoming 7–14 days and coordinate with revenue staff.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black text-slate-950">
                  GM SOP 2: OTA Distribution &amp; Two-Way Channel Parity
                </h3>
                <Link href="/channel-manager" className="text-xs font-bold text-blue-800 hover:underline">
                  Open Channel Manager ➔
                </Link>
              </div>
              <ul className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <li>• Open <strong className="text-slate-950">/channel-manager</strong> to verify connection status for MakeMyTrip, Agoda, and Booking.com.</li>
                <li>• Push real-time ARI (Availability, Rates &amp; Inventory) updates when room rates or minimum stay requirements change.</li>
                <li>• Review channel sync logs to ensure zero overbooking or rate disparity.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black text-slate-950">
                  GM SOP 3: Night Audit Supervision &amp; Revenue Reconciliation
                </h3>
                <Link href="/night-audit" className="text-xs font-bold text-blue-800 hover:underline">
                  Open Night Audit ➔
                </Link>
              </div>
              <ul className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <li>• Supervise the 1-click Night Audit rollover at 23:59 hrs on <strong className="text-slate-950">/night-audit</strong>.</li>
                <li>• Review room rate postings, cash drawer balancing, and the Daily Manager Flash Report with ADR, RevPAR, and total revenue.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-blue-100 text-blue-900 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider">
                    Direct Distribution
                  </span>
                  <h3 className="font-display text-lg font-black text-slate-950">
                    GM SOP 4: Direct Guest Booking Engine &amp; 0% Commission Distribution
                  </h3>
                </div>
                <Link href={`/book/${tenantSlug}`} className="text-xs font-bold text-blue-900 hover:underline">
                  View Public Booking Engine ➔
                </Link>
              </div>
              <ul className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <li>• Deploy your property's branded public direct booking link (<code className="bg-white px-1.5 py-0.5 rounded border border-blue-200 text-blue-900 font-mono text-xs font-bold">/book/{tenantSlug}</code>) on Google My Business, hotel official Instagram/WhatsApp, and marketing campaigns.</li>
                <li>• <strong className="text-blue-950 font-bold">Zero Commission Advantage:</strong> Direct bookings retain 100% of room tariff, bypassing the 18% to 25% commissions extracted by Online Travel Agencies (OTAs).</li>
                <li>• Incoming direct guest reservations instantly inject into the Front Desk Room Rack (<strong className="text-slate-950">/tape-chart</strong>) and reserve real inventory, eliminating double-booking risk automatically.</li>
                <li>• Guests provide advance deposits directly to the hotel's verified UPI receiving VPA, securing immediate liquidity.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 6: Front Desk & Cashiering SOP */}
      {/* ========================================================= */}
      {activeTab === 'frontdesk' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-7 shadow-xs">
            <h2 className="font-display text-xl sm:text-2xl font-black text-emerald-950">
              Front Desk &amp; Cashiering SOP (Guest Lifecycle)
            </h2>
            <p className="mt-1 text-sm text-emerald-900 leading-relaxed font-medium">
              Standard operating procedures for receptionists, front desk supervisors, and cashier executives from reservation creation to check-out and tax invoicing.
            </p>
          </div>

          <div className="relative pl-10 sm:pl-12 space-y-6 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-0.5 before:bg-slate-200">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -left-10 sm:-left-12 top-0 grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white shadow-xs">
                1
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-slate-950">
                    Interactive Drag-to-Select Booking on Tape Chart
                  </h3>
                  <Link href="/tape-chart" className="text-xs font-bold text-emerald-700 hover:underline">
                    Open Tape Chart ➔
                  </Link>
                </div>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1.5">
                  <p>• When a guest calls or arrives for a walk-in, navigate to <strong className="text-slate-950">/tape-chart</strong>.</p>
                  <p>• Click and drag across the desired check-in to check-out dates on any room row. The system displays a floating summary pill (e.g. <em>"Room 201 · Nov 6 → Nov 9 · 3 Nights"</em>).</p>
                  <p>• Click <strong>"Book Selected Dates"</strong> to jump directly into the reservation form with room and dates pre-filled.</p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -left-10 sm:-left-12 top-0 grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white shadow-xs">
                2
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-slate-950">
                    Identity Verification &amp; Statutory BoI Form C
                  </h3>
                  <Link href="/compliance" className="text-xs font-bold text-emerald-700 hover:underline">
                    Open Compliance ➔
                  </Link>
                </div>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1.5">
                  <p>• Request government ID. For Indian citizens, record Aadhaar (the ERP automatically masks everything except the last 4 digits per UIDAI compliance).</p>
                  <p>• <strong className="text-rose-900 font-bold">Foreign National Statutory Duty:</strong> If the guest carries a foreign passport, immediately open <strong className="text-slate-950">/compliance</strong> and file the <strong className="text-slate-950">Bureau of Immigration (BoI) Form C</strong> within 24 hours of arrival.</p>
                  <p>• Click <strong>"Check-In Guest"</strong>. Room switches from <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-xs font-bold">Ready</span> to <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded text-xs font-bold">Occupied</span>.</p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -left-10 sm:-left-12 top-0 grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white shadow-xs">
                3
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-slate-950">
                    Cashiering, Dual-Slab GST &amp; Section 269ST Cash Guard
                  </h3>
                  <Link href="/billing" className="text-xs font-bold text-emerald-700 hover:underline">
                    Open Cashiering ➔
                  </Link>
                </div>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1.5">
                  <p>• At checkout, open the reservation folio on <strong className="text-slate-950">/billing</strong>.</p>
                  <p>• Review automatic Indian GST calculation: <strong className="text-slate-950">12%</strong> if tariff &le; ₹7,500; <strong className="text-slate-950">18%</strong> if tariff &gt; ₹7,500 under SAC Code <code className="bg-slate-100 px-1 py-0.5 font-mono text-xs">996311</code>.</p>
                  <p>• <strong className="text-rose-900 font-bold">Section 269ST Enforcement:</strong> The ERP automatically blocks cash payments equal to or exceeding ₹2,00,000 per guest per stay. For cash &gt; ₹50,000, Rule 114B PAN validation is mandatory.</p>
                  <p>• Click <strong>"Issue GST Tax Invoice"</strong> and mark <strong>"Check-Out"</strong>.</p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="absolute -left-10 sm:-left-12 top-0 grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white shadow-xs">
                4
              </div>
              <div className="rounded-3xl border border-emerald-300 bg-emerald-50/30 p-6 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider">
                      Zero Friction
                    </span>
                    <h3 className="font-display text-base font-bold text-slate-950">
                      Dynamic NPCI Scan-to-Pay UPI QR &amp; Instant Settlement
                    </h3>
                  </div>
                  <Link href="/billing" className="text-xs font-bold text-emerald-700 hover:underline">
                    Open Folio QR ➔
                  </Link>
                </div>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1.5">
                  <p>• In the guest folio settlement modal on <strong className="text-slate-950">/billing</strong>, select <strong className="text-slate-950">UPI / QR Code</strong>.</p>
                  <p>• The system instantly computes the remaining balance and renders a real-time, tamper-proof **NPCI-compliant UPI QR code** embedded with the hotel's verified VPA, merchant name, exact rupees amount, and transaction reference.</p>
                  <p>• A live 10-minute security countdown prevents double submission. Guest scans with Google Pay, PhonePe, Paytm, CRED, or BHIM.</p>
                  <p>• Once guest completes payment, enter the 12-digit bank UTR reference number and click <strong className="text-emerald-950 font-bold">"Record UPI Settlement"</strong>.</p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="relative">
              <div className="absolute -left-10 sm:-left-12 top-0 grid h-8 w-8 place-items-center rounded-full bg-slate-950 text-xs font-bold text-white shadow-xs">
                5
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 text-emerald-900 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider">
                      Guest Delight
                    </span>
                    <h3 className="font-display text-base font-bold text-slate-950">
                      Automated WhatsApp GST Tax Invoice &amp; Folio Dispatch
                    </h3>
                  </div>
                  <Link href="/billing" className="text-xs font-bold text-emerald-700 hover:underline">
                    WhatsApp Folio ➔
                  </Link>
                </div>
                <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-1.5">
                  <p>• On any settled guest folio or issued invoice, click the <strong className="text-emerald-900 font-bold">"WhatsApp Invoice"</strong> button.</p>
                  <p>• The ERP instantly prepares and launches a direct WhatsApp Web/app message addressed to the guest's mobile phone number.</p>
                  <p>• Message includes verified hotel property branding, invoice number, room number, total amount paid, and direct link for paperless tax invoice storage.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 7: Housekeeping & Turndown SOP */}
      {/* ========================================================= */}
      {activeTab === 'housekeeping' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="rounded-3xl border border-teal-200 bg-teal-50/70 p-6 sm:p-7 shadow-xs">
            <h2 className="font-display text-xl sm:text-2xl font-black text-teal-950">
              Housekeeping &amp; Turndown SOP
            </h2>
            <p className="mt-1 text-sm text-teal-900 leading-relaxed font-medium">
              Standard Operating Procedures for floor attendants and housekeeping supervisors to transition room statuses and ensure pristine rooms for arriving guests.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black text-slate-950">
                  Room Status State Machine Transitions
                </h3>
                <Link href="/housekeeping" className="text-xs font-bold text-teal-800 hover:underline">
                  Open Housekeeping Board ➔
                </Link>
              </div>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <p>1. When a guest checks out, the room status automatically flips to <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-xs font-bold">Cleaning</span>.</p>
                <p>2. The floor attendant performs linen change, sanitation, and replenishment of bathroom amenities.</p>
                <p>3. Once cleaned, the supervisor inspects the room and updates status to <span className="bg-blue-100 text-blue-900 px-2 py-0.5 rounded text-xs font-bold">Inspected</span>.</p>
                <p>4. Once fully approved, the room status is updated to <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded text-xs font-bold">Available (Ready)</span>, making it immediately sellable to front desk agents.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-3">
              <h3 className="font-display text-lg font-black text-slate-950">
                Maintenance &amp; Out of Order Protocols
              </h3>
              <div className="text-xs sm:text-sm text-slate-700 leading-relaxed space-y-2">
                <p>• If plumbing, HVAC, or electrical issues occur, mark the room as <span className="bg-rose-100 text-rose-900 px-2 py-0.5 rounded text-xs font-bold">Maintenance</span> on <strong className="text-slate-950">/housekeeping</strong>.</p>
                <p>• Maintenance rooms are automatically removed from sellable inventory on the Front Desk Tape Chart and OTA channels to prevent double booking.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
