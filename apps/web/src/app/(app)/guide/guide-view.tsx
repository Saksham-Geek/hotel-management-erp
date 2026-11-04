'use client';

import { useState } from 'react';
import Link from 'next/link';

export function GuideView() {
  const [activeTab, setActiveTab] = useState<'pages' | 'superadmin' | 'owner' | 'frontdesk'>('pages');

  const pages = [
    {
      route: '/super-admin',
      name: 'Super Admin (HQ Console)',
      badge: 'HQ & Governance',
      role: 'Platform Owner',
      desc: 'Centralized chain-level management. Onboard new hotel properties, allocate initial rooms, assign property owners and general managers, manage subscription tiers, and switch context across all chain properties.',
      actions: ['Onboard hotel property', 'Assign owner/manager credentials', 'Switch hotel context', 'View portfolio ARR & room capacity'],
      icon: '🏢',
    },
    {
      route: '/dashboard',
      name: "Today's Front Desk",
      badge: 'Front Office',
      role: 'Front Desk / GM',
      desc: 'The operational nerve center of the hotel. Live visual room rack grouped by floor with real-time status pills (Available, Occupied, Cleaning, Maintenance). Shows expected arrivals, departures, and sellable inventory.',
      actions: ['Instant walk-in check-in', 'Monitor live occupancy %', 'Track floor turnover status', 'Access quick folio billing'],
      icon: '📋',
    },
    {
      route: '/tape-chart',
      name: 'Room Rack (Tape Chart)',
      badge: 'Front Office',
      role: 'Front Desk / GM',
      desc: 'Interactive multi-day visual Gantt chart timeline. Shows continuous reservation ribbons color-coded by channel (Walk-In, MMT, Booking.com, Agoda, Corporate). Connects directly to guest folios.',
      actions: ['Multi-day allocation overview', 'Inspect booking ribbons by OTA channel', '1-click jump to guest cashiering folio', 'Detect gaps and optimize room occupancy'],
      icon: '📊',
    },
    {
      route: '/reservations',
      name: 'Reservations & Stays',
      badge: 'Front Office',
      role: 'Front Desk / GM',
      desc: 'Complete booking ledger. Handles advance direct reservations, walk-ins, hourly day-use stays, cancellations, and status modifications.',
      actions: ['Create new booking', 'Modify stay dates', 'Cancel reservation with audit log', 'Filter by stay status'],
      icon: '🛎️',
    },
    {
      route: '/billing',
      name: 'Cashiering & GST Invoicing',
      badge: 'Finance & GST',
      role: 'Front Desk / Cashier',
      desc: 'Comprehensive billing folios with automated Indian GST dual-slab calculation (12% for tariff <= ₹7,500; 18% for tariff > ₹7,500). Enforces Section 269ST ₹2L cash payment restrictions, Rule 114B PAN validation, and B2B corporate billing with GSTIN.',
      actions: ['Post room service & laundry charges', 'Collect payments via UPI / Cash / Card', 'Issue SAC 996311 GST Tax Invoices', 'Charge to B2B Corporate Ledger'],
      icon: '💳',
    },
    {
      route: '/night-audit',
      name: 'Night Audit & Manager KPIs',
      badge: 'Finance & GST',
      role: 'Night Auditor / GM',
      desc: 'Automated end-of-day rollover engine. Advances operational business date, posts daily room charges to active folios, reconciles cashier drawers, and computes RevPAR, ADR, and occupancy metrics.',
      actions: ['Execute 1-click Night Audit rollover', 'Generate Daily Manager Revenue Report', 'Reconcile room statuses', 'Track historical ADR & RevPAR trends'],
      icon: '🌙',
    },
    {
      route: '/compliance',
      name: 'Police Beat & BoI Form C',
      badge: 'Statutory Compliance',
      role: 'Front Desk / GM',
      desc: 'Mandatory Indian statutory compliance engine. Direct Bureau of Immigration (BoI) Form C filing for foreign national guests within 24 hours of arrival, and daily local police beat station register export.',
      actions: ['File BoI Form C for foreign passports', 'Export daily police station beat register', 'Enforce Section 269ST cash compliance', 'Validate guest PAN under Rule 114B'],
      icon: '⚖️',
    },
    {
      route: '/channel-manager',
      name: 'OTA Channel Manager & Distribution',
      badge: 'Distribution',
      role: 'GM / Revenue Manager',
      desc: 'Two-way integration engine for MakeMyTrip, Booking.com, Agoda, Expedia, and Airbnb. Synchronizes live inventory, rates, and availability (ARI) and ingests incoming OTA bookings automatically.',
      actions: ['Manage OTA channel credentials', 'Simulate live OTA booking ingestion', 'Push real-time ARI availability', 'Inspect webhook sync audit logs'],
      icon: '🌐',
    },
    {
      route: '/marketing',
      name: 'Guest Follow-Up & Loyalty CRM',
      badge: 'Marketing & CRM',
      role: 'GM / Front Desk',
      desc: 'Luxury hotel marketing automation. Sends automated post-checkout WhatsApp review requests (Google Reviews & TripAdvisor), manages Taj InnerCircle loyalty tiers (Kohinoor, Platinum, Gold, Silver), tracks VIP preferences, and dispatches repeat booking campaigns.',
      actions: ['1-click WhatsApp Google review outreach', 'Track lifetime guest spend & nights', 'Log guest preferences (pillows, floor, dietary)', 'Broadcast targeted seasonal promotions'],
      icon: '💬',
    },
    {
      route: '/staff',
      name: 'Staff & Hierarchy Delegation',
      badge: 'HQ & Governance',
      role: 'Owner / GM',
      desc: 'Enterprise multi-tier organizational tree. Enforces delegation hierarchy: Owners appoint GMs, and GMs provision Front Desk and Housekeeping staff. Supports shift assignments and account credential toggles.',
      actions: ['Appoint General Managers', 'Provision Front Desk & Housekeeping logins', 'Assign staff to morning/evening/night shifts', 'Enforce role delegation boundaries'],
      icon: '👥',
    },
    {
      route: '/housekeeping',
      name: 'Housekeeping Board',
      badge: 'Operations',
      role: 'Housekeeping / Floor Attendant',
      desc: 'Real-time room turnover board. Floor attendants mark rooms from Cleaning to Inspected to Available once turned down, prioritizing expected arrivals.',
      actions: ['Update room cleaning status', 'Flag rooms under maintenance', 'Prioritize turnover for incoming guests', 'Log room inspection notes'],
      icon: '🧹',
    },
    {
      route: '/rooms',
      name: 'Room Inventory & Floor Configuration',
      badge: 'Front Office',
      role: 'Owner / GM',
      desc: 'Physical room and tariff master. Setup floors, room categories (Deluxe, Executive Suite, Palace Suite), base tariffs, and maximum guest capacities.',
      actions: ['Add room types and base tariffs', 'Configure individual room numbers', 'Set hourly day-use rates', 'Inspect floor capacity distribution'],
      icon: '🚪',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200/80 pb-6">
        <div className="flex items-center gap-2.5">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 shadow-2xs">
            Standard Operating Procedures (SOP)
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Taj Chain Edition</span>
        </div>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Hotel ERP Master Guide &amp; User Journeys
        </h1>
        <p className="mt-2 text-sm sm:text-base font-normal text-slate-500 max-w-4xl leading-relaxed">
          An executive handbook explaining which page is for what, complete role-based user journeys (Super Admin, Hotel Owner, and Front Desk), and step-by-step guest lifecycle management.
        </p>
      </div>

      {/* Modern Segmented Navigation Tabs */}
      <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 gap-1 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('pages')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'pages'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          📖 Which Page is For What ({pages.length} Modules)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('frontdesk')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'frontdesk'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          🛎️ Daily Front Desk Journey (Guest Entry ➔ Exit ➔ Marketing)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('superadmin')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'superadmin'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          👑 Super Admin Journey (HQ Portfolio Onboarding)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('owner')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
            activeTab === 'owner'
              ? 'bg-white text-slate-950 shadow-xs'
              : 'text-slate-600 hover:text-slate-950'
          }`}
        >
          🏨 Hotel Owner Journey (Property Director &amp; GM Delegation)
        </button>
      </div>

      {/* TAB 1: Which Page is For What */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <p className="text-sm font-medium text-slate-700">
            Click on any module card below to navigate directly to that page in the ERP system.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pages.map((p) => (
              <Link
                key={p.route}
                href={p.route}
                className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs hover:border-teal-500 hover:shadow-lg transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{p.icon}</span>
                    <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-800 group-hover:bg-teal-100 group-hover:text-teal-950 transition-colors">
                      {p.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-lg font-black text-slate-950 group-hover:text-teal-800 transition-colors">
                    {p.name}
                  </h3>
                  <p className="mt-0.5 text-xs font-mono text-teal-800 font-bold">{p.route}</p>
                  <p className="mt-3 text-sm text-slate-700 leading-relaxed">{p.desc}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500">
                    Key Operations:
                  </p>
                  <ul className="text-xs sm:text-[13px] text-slate-800 space-y-1">
                    {p.actions.map((act, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="text-teal-700 font-black text-sm">✓</span>
                        <span className="font-semibold">{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Daily Front Desk Journey */}
      {activeTab === 'frontdesk' && (
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <h2 className="font-display text-xl sm:text-2xl font-black text-slate-950">
              The Complete Guest Lifecycle (Check-In ➔ Stay ➔ Check-Out ➔ Review Follow-Up)
            </h2>
            <p className="mt-2 text-sm sm:text-[15px] text-slate-500 leading-relaxed font-normal">
              Standard Operating Procedure for Front Desk Executives, Reception Supervisors, and Cashiers from the moment a guest arrives until post-stay review collection.
            </p>
          </div>

          <div className="relative pl-10 sm:pl-12 space-y-8 before:absolute before:bottom-3 before:left-4 before:top-3 before:w-0.5 before:bg-slate-200">
            {/* Step 1 */}
            <div className="relative">
              <div className="absolute -left-10 sm:-left-12 top-0 grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-xs ring-4 ring-white">
                1
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                    Booking Ingestion &amp; Visual Room Rack Allocation
                  </h3>
                  <Link
                    href="/tape-chart"
                    className="text-sm font-semibold text-slate-900 hover:text-slate-600 hover:underline"
                  >
                    Open Tape Chart ➔
                  </Link>
                </div>
                <div className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed space-y-1.5">
                  <p>• Online bookings from MakeMyTrip, Agoda, and Booking.com arrive automatically via the <strong className="text-slate-950">OTA Channel Manager</strong>.</p>
                  <p>• Front Desk inspects <strong className="text-slate-950">/tape-chart</strong> (visual Gantt timeline) to view room availability across days and color-coded channel ribbons.</p>
                  <p>• For direct phone bookings or walk-ins, Front Desk clicks <strong className="text-slate-950">"+ New Reservation"</strong> on <strong className="text-slate-950">/dashboard</strong> or <strong className="text-slate-950">/reservations</strong>.</p>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="absolute -left-10 sm:-left-12 top-0 grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-xs ring-4 ring-white">
                2
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                    Guest Arrival, Identity Verification &amp; Statutory Form C
                  </h3>
                  <Link
                    href="/compliance"
                    className="text-sm font-semibold text-slate-900 hover:text-slate-600 hover:underline"
                  >
                    Open Compliance &amp; BoI ➔
                  </Link>
                </div>
                <div className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed space-y-1.5">
                  <p>• Guest arrives at reception. Front Desk locates the booking on <strong className="text-slate-950">/dashboard</strong> under <strong className="text-slate-900">Expected Arrivals</strong>.</p>
                  <p>• Verify government photo ID (Aadhaar, Passport, Driving License) and record ID number.</p>
                  <p>• <strong className="text-rose-900 font-bold">Crucial Statutory Rule:</strong> If the guest is a foreign national, Front Desk opens <strong className="text-slate-950">/compliance</strong> and files the <strong className="text-slate-950">Bureau of Immigration (BoI) Form C</strong> within 24 hours of arrival.</p>
                  <p>• Click <strong className="text-slate-900">"Check-In Guest"</strong> ➔ The room automatically flips from <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs text-emerald-800 font-semibold">Ready</span> to <span className="inline-block rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-xs text-blue-800 font-semibold">Occupied</span> on the live board.</p>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="absolute -left-10 sm:-left-12 top-0 grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-xs ring-4 ring-white">
                3
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                    In-Stay Charges &amp; Housekeeping Maintenance
                  </h3>
                  <Link
                    href="/billing"
                    className="text-sm font-semibold text-slate-900 hover:text-slate-600 hover:underline"
                  >
                    Open Billing Folio ➔
                  </Link>
                </div>
                <div className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed space-y-1.5">
                  <p>• During the stay, restaurant dining, 24/7 room service, laundry, and minibar charges are posted directly to the guest's live room folio on <strong className="text-slate-950">/billing</strong>.</p>
                  <p>• Housekeeping staff monitors room status on <strong className="text-slate-950">/housekeeping</strong>, updating turndown and cleaning statuses as work is completed.</p>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="absolute -left-10 sm:-left-12 top-0 grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-xs ring-4 ring-white">
                4
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                    Departure, Dual-Slab GST Invoicing &amp; Section 269ST Cash Guard
                  </h3>
                  <Link
                    href="/billing"
                    className="text-sm font-semibold text-slate-900 hover:text-slate-600 hover:underline"
                  >
                    Open Cashiering ➔
                  </Link>
                </div>
                <div className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed space-y-1.5">
                  <p>• Guest requests checkout. Cashier opens the reservation folio on <strong className="text-slate-950">/billing</strong>.</p>
                  <p>• System calculates Indian GST: <strong className="text-slate-950">12%</strong> if tariff &lt;= ₹7,500; <strong className="text-slate-950">18%</strong> if tariff &gt; ₹7,500 with SAC Code <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-bold">996311</code>.</p>
                  <p>• For cash payments, the system automatically enforces <strong className="text-rose-900 font-bold">Section 269ST</strong> (refuses cash over ₹2,00,000) and <strong className="text-rose-900 font-bold">Rule 114B</strong> (requires PAN for cash &gt; ₹50,000).</p>
                  <p>• Collect payment via UPI, Card, or Corporate Direct Bill ➔ Click <strong className="text-slate-900">"Issue GST Tax Invoice"</strong> and mark <strong className="text-slate-900">"Check-Out"</strong>.</p>
                  <p>• The room automatically switches to <span className="inline-block rounded-full bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 text-xs text-amber-800 font-semibold">Cleaning</span> status, alerting housekeeping.</p>
                </div>
              </div>
            </div>

            {/* Step 5 */}
            <div className="relative">
              <div className="absolute -left-10 sm:-left-12 top-0 grid h-8 w-8 sm:h-9 sm:w-9 place-items-center rounded-full bg-slate-950 text-sm font-bold text-white shadow-xs ring-4 ring-white">
                5
              </div>
              <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold text-slate-950">
                    Post-Stay Follow-Up &amp; Marketing Review Outreach
                  </h3>
                  <Link
                    href="/marketing"
                    className="text-sm font-semibold text-slate-900 hover:text-slate-600 hover:underline"
                  >
                    Open Marketing &amp; CRM ➔
                  </Link>
                </div>
                <div className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed space-y-1.5">
                  <p>• Departed guests appear on <strong className="text-slate-950">/marketing</strong> under <strong className="text-slate-900">Pending Review Outreach</strong>.</p>
                  <p>• Front Desk or General Manager clicks <strong className="text-slate-900">"Send WhatsApp"</strong> to dispatch a personalized thank-you note with a 1-click Google Reviews link.</p>
                  <p>• Guest lifetime stays, revenue (LTV), and Taj InnerCircle loyalty points update automatically in the guest's CRM profile.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Super Admin Journey */}
      {activeTab === 'superadmin' && (
        <div className="space-y-8">
          <div className="rounded-3xl border border-purple-200 bg-purple-50/70 p-6 sm:p-7 shadow-xs">
            <h2 className="font-display text-xl sm:text-2xl font-black text-purple-950">
              Platform Super Admin / HQ Chain Governance Journey
            </h2>
            <p className="mt-2 text-sm sm:text-[15px] text-purple-900 leading-relaxed font-medium">
              For corporate chain directors and software platform administrators managing multiple hotel properties across cities.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
              <h3 className="font-display text-lg sm:text-xl font-black text-slate-950">
                Phase 1: Portfolio Health & Onboarding New Hotels
              </h3>
              <div className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed space-y-2">
                <p>1. Navigate to <strong className="text-slate-950">/super-admin</strong>.</p>
                <p>2. Review aggregate chain statistics: Total active properties, total inventory keys, portfolio occupancy rate, and staff count.</p>
                <p>3. Click <strong className="text-purple-900 font-black">+ Onboard New Hotel</strong>.</p>
                <p>4. Enter the hotel's legal name, timezone (e.g. <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-bold">Asia/Kolkata</code>), currency (<code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-bold">INR</code>), and select subscription tier:
                  <br />&nbsp;&nbsp;• <strong className="text-slate-950">Starter:</strong> Homestays and small boutique properties up to 25 rooms
                  <br />&nbsp;&nbsp;• <strong className="text-slate-950">Growth:</strong> Business hotels and resorts up to 80 rooms
                  <br />&nbsp;&nbsp;• <strong className="text-slate-950">Enterprise:</strong> Luxury 5-Star chains with unlimited rooms & corporate ledgers
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
              <h3 className="font-display text-lg sm:text-xl font-black text-slate-950">
                Phase 2: Appointing Property Owners & Initial Staff
              </h3>
              <div className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed space-y-2">
                <p>1. In the onboarding modal, provision the initial <strong className="text-slate-950">Property Owner / General Manager</strong> email and temporary credentials.</p>
                <p>2. Enable <em className="font-bold text-slate-950">"Seed Starter Room Inventory"</em> to automatically generate 3 floors with Deluxe and Executive Suite rooms.</p>
                <p>3. The new property is provisioned in PostgreSQL with strict Row Level Security (RLS) tenant isolation.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
              <h3 className="font-display text-lg sm:text-xl font-black text-slate-950">
                Phase 3: Context Switching & Portfolio Impersonation
              </h3>
              <div className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed space-y-2">
                <p>1. Super Admins can click <em className="font-bold text-teal-800">"Switch to Hotel"</em> on any property card in <strong className="text-slate-950">/super-admin</strong>.</p>
                <p>2. The entire session context switches to that specific property, allowing HQ executives to inspect live folios, tape charts, and night audits without logging out.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Hotel Owner Journey */}
      {activeTab === 'owner' && (
        <div className="space-y-8">
          <div className="rounded-3xl border border-blue-200 bg-blue-50/70 p-6 sm:p-7 shadow-xs">
            <h2 className="font-display text-xl sm:text-2xl font-black text-blue-950">
              Hotel Property Owner / Managing Director Journey
            </h2>
            <p className="mt-2 text-sm sm:text-[15px] text-blue-900 leading-relaxed font-medium">
              For asset owners and hotel managing directors overseeing profitability, appointing the General Manager, and managing statutory compliance.
            </p>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
              <h3 className="font-display text-lg sm:text-xl font-black text-slate-950">
                Step 1: Appoint General Manager & Department Heads
              </h3>
              <div className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed space-y-2">
                <p>• Open <strong className="text-slate-950">/staff</strong> ➔ Click <em className="font-bold text-teal-800">"+ Add Staff Member"</em>.</p>
                <p>• Assign the <strong className="text-slate-950">General Manager (GM)</strong> who will direct daily operations.</p>
                <p>• Property Owners can also invite co-owners or finance controllers.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
              <h3 className="font-display text-lg sm:text-xl font-black text-slate-950">
                Step 2: Configure Room Inventory & Tariffs
              </h3>
              <div className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed space-y-2">
                <p>• Navigate to <strong className="text-slate-950">/rooms</strong> to set base tariffs for each room category (Standard, Deluxe, Executive Suite, Palace Suite).</p>
                <p>• Connect OTA channel distribution on <strong className="text-slate-950">/channel-manager</strong> to synchronize rates with MakeMyTrip and Booking.com.</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
              <h3 className="font-display text-lg sm:text-xl font-black text-slate-950">
                Step 3: Executive Financial Audit & Performance Review
              </h3>
              <div className="mt-3 text-sm sm:text-[15px] text-slate-700 leading-relaxed space-y-2">
                <p>• Review the daily Night Audit flash report at <strong className="text-slate-950">/night-audit</strong> to monitor RevPAR, ADR, and total room revenue.</p>
                <p>• Review monthly GST tax collections and corporate city ledger aging on <strong className="text-slate-950">/billing</strong>.</p>
                <p>• Inspect repeat guest conversion and review NPS ratings on <strong className="text-slate-950">/marketing</strong>.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
