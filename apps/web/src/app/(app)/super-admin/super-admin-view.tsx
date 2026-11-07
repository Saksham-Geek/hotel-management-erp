'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  btnCls,
  btnGhostCls,
  btnDangerCls,
  CustomDropdown,
  inputCls,
  StatCard,
  Banner,
} from '@/components/ui';
import {
  createHotel,
  assignStaff,
  quickSeedRooms,
  togglePropertyStatus,
  switchHotelAndNavigate,
} from './actions';

export interface PropertyStaffDto {
  propertyId: string;
  userId: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
  assignedAt: string;
}

export interface PropertyDto {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  isDefault: boolean;
  status: 'active' | 'suspended';
  createdAt: string;
  planKey: string;
  totalRooms: number;
  readyRooms: number;
  occupiedRooms: number;
  cleaningRooms: number;
  totalStaff: number;
  staff: PropertyStaffDto[];
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  baseRole: string;
  isActive: boolean;
  assignedPropertiesCount: number;
}

export interface SuperAdminOverviewDto {
  tenant: {
    id: string;
    slug: string;
    name: string;
    timezone: string;
    currency: string;
  };
  activePropertyId: string;
  properties: PropertyDto[];
  users: UserDto[];
  metrics: {
    totalHotels: number;
    activeHotels: number;
    totalRooms: number;
    totalOccupied: number;
    totalReady: number;
    totalStaff: number;
    occupancyRate: number;
  };
}

export function SuperAdminView({
  data,
  error,
  ok,
}: {
  data: SuperAdminOverviewDto;
  error?: string;
  ok?: string;
}) {
  const { tenant, properties, users, metrics, activePropertyId } = data;

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [activeTab, setActiveTab] = useState<'portfolio' | 'staff' | 'guide'>('portfolio');

  // Modal States
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [assignModalProperty, setAssignModalProperty] = useState<PropertyDto | null>(null);
  const [seedModalProperty, setSeedModalProperty] = useState<PropertyDto | null>(null);

  // Form helper state
  const [assignMode, setAssignMode] = useState<'new' | 'existing'>('new');
  const [autoSeedCheckbox, setAutoSeedCheckbox] = useState(true);

  // Filter properties
  const filteredProperties = useMemo(() => {
    return properties.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.staff.some((s) => s.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [properties, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if any */}
      <Banner error={error} ok={ok} />

      {/* Header Section */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-700 shadow-2xs">
            <span className="flex h-1.5 w-1.5 rounded-full bg-slate-900" />
            Super Admin · Chain HQ Console
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-black tracking-tight text-slate-950">
            {tenant.name} Hotel Portfolio
          </h1>
          <p className="mt-1 text-sm font-normal text-slate-500 max-w-2xl">
            Organization Code:{' '}
            <strong className="font-mono text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80 font-bold">
              {tenant.slug}
            </strong>{' '}
            · Multi-property governance, hotel provisioning, manager delegation &amp; centralized room rack.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowOnboardModal(true)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 active:scale-95 transition-all"
          >
            <span className="text-base leading-none">+</span> Onboard New Hotel Property
          </button>
        </div>
      </div>

      {/* Chain-Wide Portfolio Metric Cards */}
      <section aria-label="Portfolio KPIs" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hotels In Chain</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-black text-slate-950">
              {metrics.totalHotels}
            </span>
            <span className="rounded-full bg-emerald-50 border border-emerald-200/80 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              {metrics.activeHotels} Active
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">Across organization</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Chain Rooms</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-black text-slate-950">
              {metrics.totalRooms}
            </span>
            <span className="rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              {metrics.totalReady} Ready
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">Live room inventory</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Portfolio Occupancy</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-black text-slate-950">
              {metrics.occupancyRate}%
            </span>
            <span className="text-xs font-medium text-slate-500">({metrics.totalOccupied} In-House)</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-900 transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(3, metrics.occupancyRate))}%` }}
            />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Hospitality Team</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-2xl sm:text-3xl font-black text-slate-950">
              {metrics.totalStaff}
            </span>
            <span className="text-xs font-medium text-slate-500">Staff &amp; Managers</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 font-medium">Authorized user accounts</p>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line/70 pt-2 pb-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            className={`px-5 py-3 text-sm sm:text-[14.5px] font-bold rounded-xl transition-all ${
              activeTab === 'portfolio'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            🏨 Hotel Portfolio ({properties.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`px-5 py-3 text-sm sm:text-[14.5px] font-bold rounded-xl transition-all ${
              activeTab === 'staff'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            👥 Staff & Manager Directory ({users.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-5 py-3 text-sm sm:text-[14.5px] font-bold rounded-xl transition-all ${
              activeTab === 'guide'
                ? 'bg-slate-950 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
            }`}
          >
            📖 ERP Roles &amp; Workflow Standard
          </button>
        </div>

        {activeTab === 'portfolio' && (
          <div className="flex items-center gap-2.5">
            <input
              type="search"
              placeholder="Filter hotels or managers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-[42px] w-64 rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-teal-500/20"
            />
            <div className="w-40">
              <CustomDropdown
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as any)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'active', label: 'Active Only' },
                  { value: 'suspended', label: 'Suspended Only' },
                ]}
                aria-label="Filter status"
              />
            </div>
          </div>
        )}
      </div>

      {/* TAB 1: HOTEL PORTFOLIO GRID */}
      {activeTab === 'portfolio' && (
        <section aria-label="Hotel Properties Grid" className="space-y-4">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {filteredProperties.map((prop) => {
              const isCurrentActive = prop.id === activePropertyId;
              const managers = prop.staff.filter((s) => s.role === 'manager' || s.role === 'owner');
              const frontDesks = prop.staff.filter((s) => s.role === 'frontdesk');
              const housekeepings = prop.staff.filter((s) => s.role === 'housekeeping');

              return (
                <div
                  key={prop.id}
                  className={`group relative flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-lg ${
                    isCurrentActive
                      ? 'border-teal-500/80 ring-2 ring-teal-500/20'
                      : 'border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Top Property Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2
                            className="font-display text-lg font-black tracking-tight text-slate-950"
                            style={{ color: '#020617' }}
                          >
                            {prop.name}
                          </h2>
                          {prop.isDefault && (
                            <span className="rounded-md bg-slate-100 border border-slate-300 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-700">
                              HQ Flagship
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                          {prop.currency} ({prop.timezone}) · Onboarded{' '}
                          {new Date(prop.createdAt).toLocaleDateString('en-IN', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                      </div>

                      {/* Tier Badge */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${
                          prop.planKey === 'enterprise'
                            ? 'bg-amber-100 text-amber-950 border border-amber-300'
                            : 'bg-teal-100 text-teal-950 border border-teal-300'
                        }`}
                      >
                        {prop.planKey === 'enterprise' ? '👑 Taj Chain' : '⚡ Growth'}
                      </span>
                    </div>

                    {/* Room Inventory Progress Meter */}
                    <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200/70 p-3.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-slate-900">
                          🛏️ {prop.totalRooms} Rooms Configured
                        </span>
                        <div className="flex items-center gap-2 text-[11px] font-bold">
                          <span className="text-emerald-700">{prop.readyRooms} Ready</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-blue-700">{prop.occupiedRooms} Occupied</span>
                          {prop.cleaningRooms > 0 && (
                            <>
                              <span className="text-slate-300">·</span>
                              <span className="text-amber-700">{prop.cleaningRooms} Cleaning</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        {prop.totalRooms > 0 ? (
                          <>
                            <div
                              style={{ width: `${(prop.occupiedRooms / prop.totalRooms) * 100}%` }}
                              className="bg-blue-600 transition-all"
                              title={`${prop.occupiedRooms} Occupied`}
                            />
                            <div
                              style={{ width: `${(prop.readyRooms / prop.totalRooms) * 100}%` }}
                              className="bg-emerald-500 transition-all"
                              title={`${prop.readyRooms} Ready`}
                            />
                            <div
                              style={{ width: `${(prop.cleaningRooms / prop.totalRooms) * 100}%` }}
                              className="bg-amber-500 transition-all"
                              title={`${prop.cleaningRooms} Cleaning`}
                            />
                          </>
                        ) : (
                          <div className="w-full bg-slate-200" />
                        )}
                      </div>
                    </div>

                    {/* Assigned Personnel Section */}
                    <div className="mt-4 space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Assigned Management &amp; Staff ({prop.staff.length})
                      </p>

                      {prop.staff.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/50 p-2.5 text-xs text-amber-900 flex items-center justify-between">
                          <span>⚠️ No staff or manager assigned yet</span>
                          <button
                            type="button"
                            onClick={() => setAssignModalProperty(prop)}
                            className="font-bold text-teal-800 underline hover:text-teal-950"
                          >
                            + Assign Now
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {prop.staff.map((member) => (
                            <span
                              key={member.userId}
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold border ${
                                member.role === 'owner'
                                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                                  : member.role === 'manager'
                                  ? 'bg-purple-50 border-purple-200 text-purple-900'
                                  : member.role === 'frontdesk'
                                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                                  : 'bg-slate-100 border-slate-200 text-slate-800'
                              }`}
                              title={`${member.fullName} (${member.email}) · ${member.role}`}
                            >
                              <span>
                                {member.role === 'manager'
                                  ? '👔'
                                  : member.role === 'frontdesk'
                                  ? '🛎️'
                                  : member.role === 'owner'
                                  ? '👑'
                                  : '🧹'}
                              </span>
                              <span className="truncate max-w-[120px]">{member.fullName}</span>
                              <span className="text-[9px] uppercase font-black opacity-60">
                                ({member.role})
                              </span>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-5 border-t border-slate-100 pt-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {/* 1-Click Switch Button */}
                      <form action={switchHotelAndNavigate}>
                        <input type="hidden" name="propertyId" value={prop.id} />
                        <input type="hidden" name="destination" value="/dashboard" />
                        <button
                          type="submit"
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800 transition-colors shadow-xs"
                        >
                          🚀 {isCurrentActive ? 'View Front Desk' : 'Switch to Hotel'}
                        </button>
                      </form>

                      {/* Manage Rooms Button */}
                      <form action={switchHotelAndNavigate}>
                        <input type="hidden" name="propertyId" value={prop.id} />
                        <input type="hidden" name="destination" value="/rooms" />
                        <button
                          type="submit"
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-colors shadow-2xs"
                        >
                          ⚙️ Setup PMS Rooms
                        </button>
                      </form>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setAssignModalProperty(prop)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 font-bold text-teal-900 hover:bg-teal-100 transition-colors"
                      >
                        👤 + Assign Staff
                      </button>

                      <button
                        type="button"
                        onClick={() => setSeedModalProperty(prop)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        🛏️ + Batch Rooms
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* TAB 2: STAFF & MANAGER DIRECTORY */}
      {activeTab === 'staff' && (
        <section aria-label="Staff Directory" className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
            <div className="p-4 border-b border-line bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-ink">
                  Staff &amp; Management Accounts
                </h3>
                <p className="text-xs text-muted">
                  All personnel registered across {tenant.name}. They sign in using organization code{' '}
                  <strong className="font-mono text-teal-800">{tenant.slug}</strong>.
                </p>
              </div>
            </div>

            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-slate-100/70 text-slate-800 font-black uppercase text-[11px]">
                  <th className="px-5 py-3.5">Staff Member</th>
                  <th className="px-5 py-3.5">Login Email</th>
                  <th className="px-5 py-3.5">Base Role</th>
                  <th className="px-5 py-3.5">Assigned Hotels</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {users.map((u) => {
                  const assignedProps = properties.filter((p) =>
                    p.staff.some((s) => s.userId === u.id),
                  );

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-slate-950">
                        <div className="flex items-center gap-2">
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-slate-800 font-black text-xs">
                            {u.fullName.slice(0, 1)}
                          </span>
                          <span>{u.fullName}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-700">{u.email}</td>
                      <td className="px-5 py-3.5">
                        <span className="rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-[10px] font-black uppercase text-slate-800">
                          {u.baseRole}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {assignedProps.map((p) => {
                            const member = p.staff.find((s) => s.userId === u.id);
                            return (
                              <span
                                key={p.id}
                                className="rounded bg-teal-50 border border-teal-200 px-2 py-0.5 text-[10px] font-bold text-teal-900"
                              >
                                {p.name} ({member?.role})
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-300 px-2 py-0.5 text-[10px] font-black">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                          Active
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setAssignModalProperty(properties[0]);
                            setAssignMode('existing');
                          }}
                          className="font-bold text-teal-700 hover:text-teal-900 text-xs"
                        >
                          + Assign to Hotel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 3: ERP ROLES & WORKFLOW GUIDE */}
      {activeTab === 'guide' && (
        <section aria-label="ERP Workflow Guide" className="space-y-4">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-sm">
            <h3 className="font-display text-xl font-bold text-ink">
              Enterprise Hotel ERP Architecture: How Roles &amp; Responsibilities Work
            </h3>
            <p className="mt-1 text-xs text-muted max-w-2xl leading-relaxed">
              In world-class hospitality systems (Taj, Oberoi, Marriott, Opera PMS), there is a clean
              division between <strong>Corporate Super Admin (Chain Governance)</strong> and{' '}
              <strong>Local Hotel General Managers (Operational Autonomy)</strong>.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👑</span>
                  <h4 className="font-display text-sm font-black text-amber-950 uppercase tracking-wide">
                    1. Super Admin (Chain HQ)
                  </h4>
                </div>
                <ul className="mt-3 space-y-2 text-xs text-slate-700 leading-normal">
                  <li>• <strong>Onboard Hotels:</strong> Creates new properties with base currency, timezone, and subscription edition.</li>
                  <li>• <strong>Appoint Managers:</strong> Provisions initial General Managers with secure login credentials.</li>
                  <li>• <strong>Batch Pre-Provisioning:</strong> Can auto-seed 12-50 starter rooms across floors in 1 click.</li>
                  <li>• <strong>1-Click Impersonation:</strong> Can switch into any hotel at any time to audit front desk, night audits, or folios.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">👔</span>
                  <h4 className="font-display text-sm font-black text-purple-950 uppercase tracking-wide">
                    2. Hotel General Manager
                  </h4>
                </div>
                <ul className="mt-3 space-y-2 text-xs text-slate-700 leading-normal">
                  <li>• <strong>Signs In at /login:</strong> Uses organization code (<code className="font-mono text-teal-800">{tenant.slug}</code>) + email + password.</li>
                  <li>• <strong>Room &amp; Rate Customization:</strong> Configures room categories, seasonal nightly &amp; hourly rates on <Link href="/rooms" className="text-teal-700 underline font-bold">Rooms page</Link>.</li>
                  <li>• <strong>Staff Management:</strong> Assigns Front Desk clerks and Housekeeping supervisors for their property.</li>
                  <li>• <strong>End-of-Day Night Audit:</strong> Executes daily revenue roll and business date rollover.</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛎️</span>
                  <h4 className="font-display text-sm font-black text-blue-950 uppercase tracking-wide">
                    3. Front Desk &amp; Housekeeping
                  </h4>
                </div>
                <ul className="mt-3 space-y-2 text-xs text-slate-700 leading-normal">
                  <li>• <strong>Front Desk:</strong> Checks in walk-in guests, assigns rooms on the Tape Chart, issues Indian GST folios, files BoI Form C.</li>
                  <li>• <strong>Housekeeping:</strong> Views the live room board from mobile/tablet and marks rooms as "Clean / Ready" or "Under Maintenance".</li>
                  <li>• <strong>Strict Separation:</strong> Staff only see data for the property they are assigned to.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* MODAL 1: ONBOARD NEW HOTEL PROPERTY */}
      {showOnboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-display text-lg font-black text-slate-950">
                  Onboard New Hotel Property
                </h3>
                <p className="text-xs text-muted">
                  Register a new hotel in {tenant.name} and assign its management team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOnboardModal(false)}
                className="grid h-8 w-8 place-items-center rounded-xl text-muted hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form action={createHotel} className="mt-5 space-y-4">
              <label className="block text-xs font-bold text-ink">
                Hotel Property Name *
                <input
                  name="name"
                  required
                  placeholder="e.g. Taj Lake Palace, Udaipur"
                  className={`${inputCls} mt-1`}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Subscription Tier Edition</label>
                  <CustomDropdown
                    name="planKey"
                    defaultValue="growth"
                    size="sm"
                    options={[
                      { value: 'starter', label: '🌱 Starter (Boutique & Small)' },
                      { value: 'growth', label: '⚡ Growth Edition (Mid-Scale & Resort)' },
                      { value: 'enterprise', label: '👑 Taj Chain Edition (Luxury & Multi-Property)' },
                    ]}
                    aria-label="Subscription Tier Edition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink mb-1">Base Currency</label>
                  <CustomDropdown
                    name="currency"
                    defaultValue="INR"
                    size="sm"
                    options={[
                      { value: 'INR', label: 'INR (₹ - Indian Rupee)' },
                      { value: 'USD', label: 'USD ($ - US Dollar)' },
                      { value: 'EUR', label: 'EUR (€ - Euro)' },
                      { value: 'AED', label: 'AED (د.إ - UAE Dirham)' },
                    ]}
                    aria-label="Base Currency"
                  />
                </div>
              </div>

              {/* Initial General Manager Assignment */}
              <div className="rounded-2xl border border-teal-500/30 bg-teal-50/50 p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-wider text-teal-950 flex items-center gap-1.5">
                  <span>👔</span> Appoint Initial General Manager (Optional)
                </p>
                <p className="text-[11px] text-teal-800 leading-tight">
                  Provision a manager now so they can log in immediately. You can also assign one later.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block text-xs font-bold text-ink">
                    Manager Full Name
                    <input
                      name="managerName"
                      placeholder="e.g. Vikramaditya Rathore"
                      className={`${inputCls} mt-1 bg-white`}
                    />
                  </label>
                  <label className="block text-xs font-bold text-ink">
                    Manager Email
                    <input
                      name="managerEmail"
                      type="email"
                      placeholder="e.g. gm.udaipur@tajhotels.com"
                      className={`${inputCls} mt-1 bg-white`}
                    />
                  </label>
                </div>

                <label className="block text-xs font-bold text-ink">
                  Manager Login Password
                  <input
                    name="managerPassword"
                    defaultValue="HotelStaff123!"
                    placeholder="Minimum 8 characters"
                    className={`${inputCls} mt-1 bg-white font-mono`}
                  />
                  <span className="text-[10px] text-muted">
                    Default password: <code>HotelStaff123!</code> (Manager can change after sign-in).
                  </span>
                </label>
              </div>

              {/* Auto-Seed Starter Rooms Checkbox */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-black text-slate-900">
                  <input
                    type="checkbox"
                    name="seedRooms"
                    checked={autoSeedCheckbox}
                    onChange={(e) => setAutoSeedCheckbox(e.target.checked)}
                    className="h-4 w-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span>🛏️ Auto-Generate Starter Floors &amp; Rooms (Floors 1-3, 12 Rooms)</span>
                </label>
                <p className="text-[11px] text-muted leading-relaxed pl-6">
                  Pre-creates 3 hospitality room types (Deluxe, Royal Suite, Palace Suite) and 12 ready-to-sell rooms.
                  The General Manager can modify or add more anytime.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setShowOnboardModal(false)}
                  className={btnGhostCls}
                >
                  Cancel
                </button>
                <button type="submit" className={btnCls}>
                  Onboard Hotel Property
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ASSIGN STAFF / MANAGER */}
      {assignModalProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-display text-lg font-black text-slate-950">
                  Assign Staff to {assignModalProperty.name}
                </h3>
                <p className="text-xs text-muted">
                  Provide login access to this property for a new or existing team member.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignModalProperty(null)}
                className="grid h-8 w-8 place-items-center rounded-xl text-muted hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Toggle Mode: Existing vs New */}
            <div className="mt-4 flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAssignMode('new')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  assignMode === 'new' ? 'bg-white shadow-xs text-slate-950' : 'text-slate-600'
                }`}
              >
                + Create New Account
              </button>
              <button
                type="button"
                onClick={() => setAssignMode('existing')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  assignMode === 'existing' ? 'bg-white shadow-xs text-slate-950' : 'text-slate-600'
                }`}
              >
                Assign Existing Member
              </button>
            </div>

            <form action={assignStaff} className="mt-4 space-y-3.5">
              <input type="hidden" name="propertyId" value={assignModalProperty.id} />

              <div>
                <label className="block text-xs font-bold text-ink mb-1">
                  Role at {assignModalProperty.name}
                </label>
                <CustomDropdown
                  name="role"
                  defaultValue="manager"
                  size="sm"
                  options={[
                    { value: 'manager', label: '👔 General Manager (Full Property Control)' },
                    { value: 'frontdesk', label: '🛎️ Front Desk Officer (Check-In & Folios)' },
                    { value: 'housekeeping', label: '🧹 Housekeeping Supervisor (Room Cleaning)' },
                    { value: 'owner', label: '👑 Co-Owner / Director' },
                  ]}
                  aria-label={`Role at ${assignModalProperty.name}`}
                />
              </div>

              {assignMode === 'existing' ? (
                <div>
                  <label className="block text-xs font-bold text-ink mb-1">
                    Select Existing Team Member
                  </label>
                  <CustomDropdown
                    name="userId"
                    required
                    placeholder="Choose a team member..."
                    onChange={(val) => {
                      const sel = users.find((u) => u.id === val);
                      const emailInput = document.getElementById('assign-email-input') as HTMLInputElement;
                      if (emailInput && sel) emailInput.value = sel.email;
                    }}
                    options={users.map((u) => ({
                      value: u.id,
                      label: `${u.fullName} (${u.email}) · ${u.baseRole}`,
                      badge: u.baseRole,
                    }))}
                    aria-label="Select Existing Team Member"
                  />
                  <input type="hidden" id="assign-email-input" name="email" value="" />
                </div>
              ) : (
                <>
                  <label className="block text-xs font-bold text-ink">
                    Full Name *
                    <input
                      name="fullName"
                      required
                      placeholder="e.g. Priya Sharma"
                      className={`${inputCls} mt-1`}
                    />
                  </label>

                  <label className="block text-xs font-bold text-ink">
                    Email Address *
                    <input
                      name="email"
                      type="email"
                      required
                      placeholder="e.g. priya@grandazure.test"
                      className={`${inputCls} mt-1`}
                    />
                  </label>

                  <label className="block text-xs font-bold text-ink">
                    Login Password *
                    <input
                      name="password"
                      defaultValue="HotelStaff123!"
                      required
                      minLength={8}
                      className={`${inputCls} mt-1 font-mono`}
                    />
                    <span className="text-[10px] text-muted">
                      Organization code for login is <strong>{tenant.slug}</strong>.
                    </span>
                  </label>
                </>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setAssignModalProperty(null)}
                  className={btnGhostCls}
                >
                  Cancel
                </button>
                <button type="submit" className={btnCls}>
                  Confirm &amp; Assign Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: BATCH SEED ROOMS & FLOORS */}
      {seedModalProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-line bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-display text-lg font-black text-slate-950">
                  Batch Room Provisioner
                </h3>
                <p className="text-xs text-muted">
                  Quickly generate floors and rooms for {seedModalProperty.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSeedModalProperty(null)}
                className="grid h-8 w-8 place-items-center rounded-xl text-muted hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form action={quickSeedRooms} className="mt-4 space-y-3.5">
              <input type="hidden" name="propertyId" value={seedModalProperty.id} />

              <div className="grid grid-cols-3 gap-2.5">
                <label className="block text-xs font-bold text-ink">
                  Floors
                  <input
                    name="floors"
                    type="number"
                    min="1"
                    max="15"
                    defaultValue="3"
                    required
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <label className="block text-xs font-bold text-ink">
                  Rooms / Floor
                  <input
                    name="roomsPerFloor"
                    type="number"
                    min="1"
                    max="20"
                    defaultValue="4"
                    required
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <label className="block text-xs font-bold text-ink">
                  Start Floor
                  <input
                    name="startFloor"
                    type="number"
                    min="1"
                    max="50"
                    defaultValue="1"
                    required
                    className={`${inputCls} mt-1`}
                  />
                </label>
              </div>

              <label className="block text-xs font-bold text-ink">
                Room Category Type Name
                <input
                  name="typeName"
                  defaultValue="Deluxe Heritage Room"
                  required
                  className={`${inputCls} mt-1`}
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-ink">
                  Nightly Base Tariff ({seedModalProperty.currency})
                  <input
                    name="baseRate"
                    type="number"
                    min="0"
                    step="100"
                    defaultValue="4500"
                    required
                    className={`${inputCls} mt-1`}
                  />
                </label>
                <label className="block text-xs font-bold text-ink">
                  Guest Capacity
                  <input
                    name="capacity"
                    type="number"
                    min="1"
                    max="10"
                    defaultValue="2"
                    required
                    className={`${inputCls} mt-1`}
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setSeedModalProperty(null)}
                  className={btnGhostCls}
                >
                  Cancel
                </button>
                <button type="submit" className={btnCls}>
                  Generate Rooms Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
