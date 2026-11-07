'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Banner, btnCls, btnGhostCls, CustomDropdown, inputCls, selectCls } from '@/components/ui';
import { onboardHotelAction, updateTenantPlanAction, updateTenantStatusAction } from './actions';

export interface PlatformTenantDto {
  id: string;
  slug: string;
  name: string;
  status: 'active' | 'suspended';
  contactEmail: string | null;
  contactPhone: string | null;
  churnReason: string | null;
  churnedAt: string | null;
  createdAt: string;
  planKey: string;
  monthlyFee: number;
  subStatus: 'active' | 'trialing' | 'past_due' | 'canceled';
  propertiesCount: number;
  totalRooms: number;
  totalStaff: number;
  lifetimeRevenue: number;
  ownerName?: string;
  ownerEmail?: string;
}

export interface PlatformOverviewDto {
  metrics: {
    mrr: number;
    arr: number;
    lifetimeRevenue: number;
    activeTenantsCount: number;
    activePropertiesCount: number;
    totalRoomsPowered: number;
    churnedCount: number;
    pastDueCount: number;
    churnRate: number;
  };
  tenants: PlatformTenantDto[];
  timeline: {
    month: string;
    label: string;
    totalAmount: number;
    invoicesCount: number;
  }[];
  planTiers: any[];
}

export function PlatformAdminView({
  data,
  currentEmail,
  error: initialError,
  ok: initialOk,
}: {
  data: PlatformOverviewDto;
  currentEmail: string;
  error?: string;
  ok?: string;
}) {
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'past_due' | 'churned'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [localFeedback, setLocalFeedback] = useState<{ error?: string; ok?: string } | null>(null);

  // Form state for new onboarding
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+91 ');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newPlan, setNewPlan] = useState<'starter' | 'growth' | 'enterprise'>('growth');
  const [initialFloors, setInitialFloors] = useState(3);
  const [roomsPerFloor, setRoomsPerFloor] = useState(4);
  const [seedRooms, setSeedRooms] = useState(true);

  const { metrics, tenants, timeline } = data;

  const filteredTenants = useMemo(() => {
    let list = tenants;
    if (filterTab === 'active') {
      list = list.filter((t) => t.status === 'active' && t.subStatus !== 'canceled');
    } else if (filterTab === 'past_due') {
      list = list.filter((t) => t.subStatus === 'past_due');
    } else if (filterTab === 'churned') {
      list = list.filter((t) => t.status === 'suspended' || t.subStatus === 'canceled');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.slug.toLowerCase().includes(q) ||
          (t.ownerName && t.ownerName.toLowerCase().includes(q)) ||
          (t.contactEmail && t.contactEmail.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [tenants, filterTab, searchQuery]);

  // Max revenue in timeline for chart scaling
  const maxTimelineRevenue = useMemo(() => {
    if (!timeline.length) return 100000;
    const max = Math.max(...timeline.map((p) => p.totalAmount));
    return max > 0 ? max : 100000;
  }, [timeline]);

  function handleAutoSlug(name: string) {
    setNewName(name);
    const slugified = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30);
    setNewSlug(slugified);
  }

  function handleStatusToggle(tenantId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const reason = nextStatus === 'suspended' ? 'Suspended by platform administrator' : undefined;
    startTransition(async () => {
      const res = await updateTenantStatusAction(tenantId, nextStatus, reason);
      setLocalFeedback(res);
    });
  }

  function handlePlanChange(tenantId: string, plan: 'starter' | 'growth' | 'enterprise') {
    startTransition(async () => {
      const res = await updateTenantPlanAction(tenantId, plan);
      setLocalFeedback(res);
    });
  }

  async function handleOnboardSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await onboardHotelAction(fd);
      setLocalFeedback(res);
      if (res.ok) {
        setIsOnboardOpen(false);
        setNewName('');
        setNewSlug('');
        setNewEmail('');
        setNewOwnerName('');
      }
    });
  }

  return (
    <div className="space-y-8 pb-16">
      {/* 1. Header with Bundled Notes Signature Accent */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-0.5 text-xs font-black text-white uppercase tracking-wider shadow-2xs">
              <span>⚡</span>
              <span>SaaS Founder Headquarters</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Tenant Cloud Operations</span>
            </span>
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display">
            SaaS Platform Revenue &amp; Hotel Portfolio
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
            Monitor monthly recurring revenue (MRR), active client hotels, subscription retention, and portfolio churn across India.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/showcase"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 transition-all"
          >
            <span>👑 Client Showcase Hub</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsOnboardOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all active:scale-95 cursor-pointer"
          >
            <span>+ Onboard New Hotel</span>
          </button>
        </div>
      </div>

      <Banner
        error={localFeedback?.error ?? initialError}
        ok={localFeedback?.ok ?? initialOk}
      />

      {/* 2. SaaS Financial & Operational KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* MRR */}
        <div className="rounded-2xl border border-slate-200/80 bg-[#f4fbf7] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <span className="h-1.5 w-6 rounded-full bg-emerald-500 block mb-2.5" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
            Monthly Recurring (MRR)
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight font-mono">
              ₹{metrics.mrr.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-emerald-800">
            Active monthly subscriptions
          </p>
        </div>

        {/* ARR */}
        <div className="rounded-2xl border border-slate-200/80 bg-[#f4faff] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <span className="h-1.5 w-6 rounded-full bg-sky-500 block mb-2.5" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-sky-900">
            Annual Run-Rate (ARR)
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight font-mono">
              ₹{(metrics.arr / 100000).toFixed(2)}L
            </span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-sky-800">
            ₹{metrics.arr.toLocaleString()} annualized
          </p>
        </div>

        {/* Active Hotels */}
        <div className="rounded-2xl border border-slate-200/80 bg-[#faf8ff] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <span className="h-1.5 w-6 rounded-full bg-purple-500 block mb-2.5" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-900">
            Active Hotel Clients
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight">
              {metrics.activeTenantsCount} Groups
            </span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-purple-800">
            {metrics.activePropertiesCount} physical properties
          </p>
        </div>

        {/* Total Rooms */}
        <div className="rounded-2xl border border-slate-200/80 bg-[#fffcf4] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <span className="h-1.5 w-6 rounded-full bg-amber-500 block mb-2.5" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
            Total Keys Powered
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight font-mono">
              {metrics.totalRoomsPowered}
            </span>
            <span className="text-xs font-bold text-amber-900">Rooms</span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-amber-800">
            Live inventory under ERP
          </p>
        </div>

        {/* Lifetime Revenue */}
        <div className="rounded-2xl border border-slate-200/80 bg-[#fdf4ff] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <span className="h-1.5 w-6 rounded-full bg-fuchsia-500 block mb-2.5" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-fuchsia-900">
            Lifetime Platform Income
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight font-mono">
              ₹{(metrics.lifetimeRevenue / 100000).toFixed(2)}L
            </span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-fuchsia-800">
            ₹{metrics.lifetimeRevenue.toLocaleString()} cumulative
          </p>
        </div>

        {/* Churn Rate */}
        <div className="rounded-2xl border border-slate-200/80 bg-[#fff5f5] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <span className="h-1.5 w-6 rounded-full bg-rose-500 block mb-2.5" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-900">
            SaaS Net Churn
          </p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl sm:text-2xl font-extrabold text-slate-950 tracking-tight font-mono">
              {metrics.churnRate}%
            </span>
          </div>
          <p className="mt-1 text-[10px] font-semibold text-rose-800">
            {metrics.churnedCount} canceled · {metrics.pastDueCount} past due
          </p>
        </div>
      </div>

      {/* 3. Monthly Recurring Revenue Timeline Graph */}
      {timeline.length > 0 && (
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <h2 className="text-base font-extrabold text-slate-950 font-display">
                  Platform Recurring Subscription Receipts (Past 12 Months)
                </h2>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 font-medium">
                Actual subscription payments collected from client hotels month-over-month.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
                <span>Paid Monthly SaaS Receipts</span>
              </span>
            </div>
          </div>

          {/* Interactive Bar Chart */}
          <div className="relative pt-6">
            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 h-44 items-end">
              {timeline.slice(-12).map((item, idx) => {
                const heightPct = Math.max(8, Math.round((item.totalAmount / maxTimelineRevenue) * 100));
                return (
                  <div key={idx} className="flex flex-col items-center gap-2 group relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] px-2.5 py-1 rounded-xl shadow-lg whitespace-nowrap pointer-events-none">
                      <span className="font-bold font-mono">₹{item.totalAmount.toLocaleString()}</span>
                      <span className="text-slate-400">{item.invoicesCount} hotel invoices</span>
                    </div>

                    <div className="w-full bg-slate-100 rounded-t-xl overflow-hidden flex items-end h-32">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 rounded-t-xl group-hover:brightness-110 transition-all"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center">
                      {item.label.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. Client Hotels Directory & Subscription Control */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
          {/* Tab Filter Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              All Client Hotels ({tenants.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('active')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                filterTab === 'active'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Active Paid ({metrics.activeTenantsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('past_due')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                filterTab === 'past_due'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Past Due ({metrics.pastDueCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('churned')}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                filterTab === 'churned'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              Left Subscription / Churned ({metrics.churnedCount})
            </button>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="search"
              placeholder="Search hotel, slug, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/5"
            />
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                <th className="px-4 py-3.5">Hotel Organization &amp; Code</th>
                <th className="px-3 py-3.5">Properties &amp; Keys</th>
                <th className="px-3 py-3.5">Plan Tier &amp; MRR</th>
                <th className="px-3 py-3.5">Status</th>
                <th className="px-3 py-3.5">Lifetime LTV</th>
                <th className="px-3 py-3.5">Owner Contact</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredTenants.map((t) => {
                const isTajOrItc = t.planKey === 'enterprise';
                const isChurned = t.status === 'suspended' || t.subStatus === 'canceled';
                const isPastDue = t.subStatus === 'past_due';

                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-slate-950 font-display text-sm">
                        {t.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {t.slug}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Since {t.createdAt.slice(0, 10)}
                        </span>
                      </div>
                    </td>

                    <td className="px-3 py-3.5">
                      <div className="font-bold text-slate-900">
                        {t.propertiesCount} {t.propertiesCount > 1 ? 'Properties' : 'Property'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {t.totalRooms} Room Keys
                      </div>
                    </td>

                    <td className="px-3 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border ${
                            isTajOrItc
                              ? 'bg-amber-100 text-amber-950 border-amber-300'
                              : t.planKey === 'growth'
                              ? 'bg-blue-100 text-blue-950 border-blue-300'
                              : 'bg-slate-100 text-slate-800 border-slate-300'
                          }`}
                        >
                          {t.planKey}
                        </span>
                      </div>
                      <div className="font-mono font-bold text-slate-900 mt-1">
                        ₹{t.monthlyFee.toLocaleString()} / mo
                      </div>
                    </td>

                    <td className="px-3 py-3.5">
                      {isChurned ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                            <span>✕</span>
                            <span>Left Subscription</span>
                          </span>
                          {t.churnReason && (
                            <p className="text-[10px] text-slate-500 italic max-w-xs truncate" title={t.churnReason}>
                              {t.churnReason}
                            </p>
                          )}
                        </div>
                      ) : isPastDue ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <span>⚠️</span>
                          <span>Payment Overdue</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span>Active (Paid)</span>
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3.5 font-mono font-bold text-slate-900">
                      ₹{t.lifetimeRevenue.toLocaleString()}
                    </td>

                    <td className="px-3 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {t.ownerName || 'Hotel Owner'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[160px]" title={t.contactEmail || ''}>
                        {t.contactEmail || 'No email registered'}
                      </div>
                      {t.contactPhone && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          {t.contactPhone}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Plan Switcher */}
                        <div className="w-28 text-left">
                          <CustomDropdown
                            value={t.planKey}
                            onChange={(val) => handlePlanChange(t.id, val as any)}
                            disabled={isPending}
                            size="sm"
                            options={[
                              { value: 'starter', label: 'Starter' },
                              { value: 'growth', label: 'Growth' },
                              { value: 'enterprise', label: 'Enterprise' },
                            ]}
                            aria-label="Switch plan"
                          />
                        </div>

                        {/* Status Toggle */}
                        <button
                          type="button"
                          onClick={() => handleStatusToggle(t.id, t.status)}
                          disabled={isPending}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                            t.status === 'active'
                              ? 'border border-rose-200 bg-white text-rose-700 hover:bg-rose-50'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {t.status === 'active' ? 'Suspend' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Churn & Retention Audit Ledger */}
      {data.metrics.churnedCount > 0 && (
        <div className="rounded-3xl border border-rose-200/80 bg-[#fff5f5]/50 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">📉</span>
            <div>
              <h2 className="text-base font-extrabold text-slate-950 font-display">
                Churn &amp; Offboarded Hotels Retention Log
              </h2>
              <p className="text-xs text-slate-600 font-medium">
                Records of clients who canceled or left the platform subscription, including stated reason and lifetime revenue before exit.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tenants
              .filter((t) => t.status === 'suspended' || t.subStatus === 'canceled')
              .map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-rose-200 bg-white p-4 shadow-2xs space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-950 font-display">
                        {t.name}
                      </span>
                      <span className="rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-900">
                        Offboarded
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      <strong>Exit Reason:</strong> {t.churnReason || 'Subscription expired / cancelled by hotelier'}
                    </p>
                    <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-3">
                      <span>Onboarded: {t.createdAt.slice(0, 10)}</span>
                      <span>Left: {t.churnedAt ? t.churnedAt.slice(0, 10) : 'Recent'}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600">
                      Lifetime Revenue Paid: <strong className="font-mono text-slate-900 font-bold">₹{t.lifetimeRevenue.toLocaleString()}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(t.id, 'suspended')}
                      disabled={isPending}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Reactivate Subscription
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 6. Onboard New Hotel Drawer / Modal */}
      {isOnboardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-950 font-display">
                  + Onboard New Client Hotel Organization
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Provision fresh tenant, subscription tier, and clean room rack. Zero dummy bookings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOnboardOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleOnboardSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-slate-700">
                  Hotel / Brand Name:
                  <input
                    name="name"
                    required
                    value={newName}
                    onChange={(e) => handleAutoSlug(e.target.value)}
                    placeholder="e.g. Royal Orchid Resort"
                    className={`${inputCls} mt-1`}
                  />
                </label>

                <label className="block text-xs font-bold text-slate-700">
                  Unique Code / Slug:
                  <input
                    name="slug"
                    required
                    value={newSlug}
                    onChange={(e) => setNewSlug(e.target.value.toLowerCase())}
                    placeholder="e.g. royal-orchid"
                    className={`${inputCls} mt-1 font-mono`}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-slate-700">
                  Owner Full Name:
                  <input
                    name="ownerName"
                    required
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    placeholder="e.g. Suresh Kumar"
                    className={`${inputCls} mt-1`}
                  />
                </label>

                <label className="block text-xs font-bold text-slate-700">
                  Owner Email (Login):
                  <input
                    name="contactEmail"
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="name@hotel.com"
                    className={`${inputCls} mt-1`}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="block text-xs font-bold text-slate-700">
                  Contact Phone:
                  <input
                    name="contactPhone"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className={`${inputCls} mt-1 font-mono`}
                  />
                </label>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subscription Tier:</label>
                  <CustomDropdown
                    name="planKey"
                    value={newPlan}
                    onChange={(val) => setNewPlan(val as any)}
                    size="sm"
                    options={[
                      { value: 'starter', label: 'Starter (₹1,999/mo) — Boutique/Homestay' },
                      { value: 'growth', label: 'Growth (₹5,999/mo) — Mid-Scale & Resorts' },
                      { value: 'enterprise', label: 'Enterprise (₹19,999/mo) — Luxury & Chains' },
                    ]}
                    aria-label="Subscription Tier"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    name="seedInitialRooms"
                    value="true"
                    checked={seedRooms}
                    onChange={(e) => setSeedRooms(e.target.checked)}
                    className="rounded text-slate-900 focus:ring-slate-950"
                  />
                  <span>Provision clean room inventory template ({initialFloors * roomsPerFloor} rooms)</span>
                </label>

                {seedRooms && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Floors:
                      <input
                        name="initialFloors"
                        type="number"
                        min={1}
                        max={10}
                        value={initialFloors}
                        onChange={(e) => setInitialFloors(parseInt(e.target.value, 10))}
                        className={`${inputCls} mt-0.5 text-xs h-8`}
                      />
                    </label>
                    <label className="block text-[11px] font-semibold text-slate-600">
                      Rooms per Floor:
                      <input
                        name="roomsPerFloor"
                        type="number"
                        min={1}
                        max={20}
                        value={roomsPerFloor}
                        onChange={(e) => setRoomsPerFloor(parseInt(e.target.value, 10))}
                        className={`${inputCls} mt-0.5 text-xs h-8`}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOnboardOpen(false)}
                  className={btnGhostCls}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className={btnCls}
                >
                  {isPending ? 'Provisioning...' : 'Complete Onboarding & Activate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
