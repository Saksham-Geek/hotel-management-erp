'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatMoney } from '@/lib/format';
import { CustomDatePicker } from '@/components/date-picker';
import type { IncomeReportDto } from './types';

export function IncomeDashboardView({
  initialData,
  financialStatements,
  propertyName,
  role,
  hasAccountingGl = true,
}: {
  initialData: IncomeReportDto;
  financialStatements?: {
    trialBalance: { items: any[]; totalDebit: number; totalCredit: number; isBalanced: boolean };
    profitAndLoss: { revenueItems: any[]; expenseItems: any[]; totalRevenue: number; totalExpenses: number; netProfitOrLoss: number; profitMarginPercent: number };
    balanceSheet: { assetItems: any[]; liabilityItems: any[]; equityItems: any[]; totalAssets: number; totalLiabilities: number; totalEquity: number; isBalanced: boolean };
  } | null;
  propertyName: string;
  role: string;
  hasAccountingGl?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<'analytics' | 'general_ledger'>('analytics');
  const [activePeriod, setActivePeriod] = useState<string>(initialData.period || 'monthly');
  const [customStart, setCustomStart] = useState<string>(initialData.startDate);
  const [customEnd, setCustomEnd] = useState<string>(initialData.endDate);
  const [dailyDate, setDailyDate] = useState<string>(initialData.endDate);
  const [chartMode, setChartMode] = useState<'stacked' | 'gross_net' | 'yield'>('stacked');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const currency = initialData.currency || 'INR';
  const { summary, departments, channels, tenders, roomTypes, timeline, ledgerRows } = initialData;

  function applyPeriod(newPeriod: string, extra?: { start?: string; end?: string; date?: string }) {
    setActivePeriod(newPeriod);
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', newPeriod);
    if (extra?.start) params.set('startDate', extra.start);
    else params.delete('startDate');
    if (extra?.end) params.set('endDate', extra.end);
    else params.delete('endDate');
    if (extra?.date) params.set('date', extra.date);
    else params.delete('date');
    router.push(`/income?${params.toString()}`);
  }

  // Pre-calculated Max Values for Chart Scaling
  const maxGross = useMemo(() => {
    if (!timeline.length) return 100000;
    const max = Math.max(...timeline.map((p) => p.gross));
    return max > 0 ? max : 100000;
  }, [timeline]);

  const maxYield = useMemo(() => {
    if (!timeline.length) return 15000;
    const max = Math.max(...timeline.map((p) => Math.max(p.adr, p.revpar)));
    return max > 0 ? max : 15000;
  }, [timeline]);

  return (
    <div className="space-y-6 pb-12 print:space-y-4 print:pb-0">
      {/* 1. Executive Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 border border-purple-300 px-3 py-0.5 text-xs font-black text-purple-950 uppercase tracking-wider shadow-2xs">
              <span>👑</span>
              <span>Owner &amp; Board Confidential</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Taj / ITC Luxury Protocol</span>
            </span>
          </div>

          <h1 className="mt-2 text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground tracking-tight font-display break-words">
            Executive Income &amp; Revenue Analytics
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground font-medium">
            Proprietary P&amp;L and revenue intelligence for <strong>{propertyName}</strong>. Track daily, weekly, monthly, quarterly, and annual hotel turnover.
          </p>
        </div>

        {/* Executive Actions */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 print:hidden shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card text-foreground px-3.5 sm:px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:bg-muted/30 hover:border-slate-400 transition-all active:scale-95"
            title="Generate print-ready Executive Board Pack & P&L Statement"
          >
            <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H9v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Board Pack</span>
          </button>

          <button
            type="button"
            onClick={() => applyPeriod(activePeriod)}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-primary px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-primary-foreground shadow-xs hover:opacity-90 transition-all active:scale-95 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Live Refresh</span>
          </button>
        </div>
      </div>

      {/* Primary Navigation: USALI Operational Analytics vs Double-Entry General Ledger */}
      <div className="flex items-center gap-3 border-b border-border print:hidden">
        <button
          type="button"
          onClick={() => setActiveTab('analytics')}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'border-purple-600 text-purple-900 font-extrabold'
              : 'border-transparent text-muted-foreground hover:text-slate-800'
          }`}
        >
          <span>📈 USALI Yield &amp; Operational Revenue</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('general_ledger')}
          className={`pb-3 text-xs font-bold transition border-b-2 flex items-center gap-2 ${
            activeTab === 'general_ledger'
              ? 'border-purple-600 text-purple-900 font-extrabold'
              : 'border-transparent text-muted-foreground hover:text-slate-800'
          }`}
        >
          <span>⚖️ Double-Entry General Ledger, P&amp;L &amp; Balance Sheet</span>
          <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-bold">
            Live COA
          </span>
        </button>
      </div>

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* 2. Interactive Period & Calendar Selection Bar */}
          <div className="rounded-2xl border border-border bg-card p-3.5 sm:p-4 shadow-xs print:hidden">
        <div className="flex flex-col gap-3.5 xl:flex-row xl:items-center xl:justify-between">
          {/* Quick Period Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {[
              { id: 'daily', label: 'Daily' },
              { id: 'weekly', label: 'Weekly (7d)' },
              { id: 'monthly', label: 'Monthly (30d)' },
              { id: 'quarterly', label: 'Quarterly (3m)' },
              { id: 'six_months', label: '6 Month' },
              { id: 'one_year', label: '1 Year' },
              { id: 'yearly', label: 'Yearly (FY)' },
              { id: 'custom', label: '📅 Custom Range' },
            ].map((p) => {
              const active = activePeriod === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (p.id === 'custom') {
                      setActivePeriod('custom');
                    } else if (p.id === 'daily') {
                      applyPeriod('daily', { date: dailyDate });
                    } else {
                      applyPeriod(p.id);
                    }
                  }}
                  className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-bold transition-all shadow-2xs cursor-pointer ${
                    active
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-card text-foreground/80 border border-border hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Active Period Date Badge */}
          <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold text-muted-foreground bg-card border border-border rounded-xl px-3.5 py-2 self-start xl:self-auto shrink-0 whitespace-nowrap shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Auditing:</span>
            <strong className="text-foreground font-mono">
              {initialData.startDate}
            </strong>
            <span>→</span>
            <strong className="text-foreground font-mono">
              {initialData.endDate}
            </strong>
          </div>
        </div>

        {/* Sub-Controls: Daily Date Picker */}
        {activePeriod === 'daily' && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground/90">
              <span>Select Date:</span>
              <CustomDatePicker
                value={dailyDate}
                onChange={(val) => {
                  setDailyDate(val);
                  applyPeriod('daily', { date: val });
                }}
                size="sm"
                aria-label="Daily date"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setDailyDate(today);
                applyPeriod('daily', { date: today });
              }}
              className="rounded-lg border border-border bg-card text-foreground px-2.5 py-1 text-xs font-medium text-foreground/90 hover:bg-muted/30"
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => {
                const yest = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
                setDailyDate(yest);
                applyPeriod('daily', { date: yest });
              }}
              className="rounded-lg border border-border bg-card text-foreground px-2.5 py-1 text-xs font-medium text-foreground/90 hover:bg-muted/30"
            >
              Yesterday
            </button>
          </div>
        )}

        {/* Sub-Controls: Custom Date Range Picker */}
        {activePeriod === 'custom' && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground/90">From:</span>
              <CustomDatePicker
                value={customStart}
                onChange={(val) => setCustomStart(val)}
                size="sm"
                aria-label="From date"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground/90">To:</span>
              <CustomDatePicker
                value={customEnd}
                onChange={(val) => setCustomEnd(val)}
                size="sm"
                aria-label="To date"
              />
            </div>

            <button
              type="button"
              onClick={() => applyPeriod('custom', { start: customStart, end: customEnd })}
              className="rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1 text-xs font-bold transition-all shadow-xs"
            >
              Apply Range →
            </button>
          </div>
        )}
      </div>

      {/* 3. Executive KPI Cards (Taj / ITC Standard) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Gross Revenue */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="min-w-0">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span className="truncate">Gross Revenue (Income)</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0 ml-2" />
            </div>
            <div
              className="mt-2 font-mono text-xl sm:text-2xl 2xl:text-3xl font-black text-foreground tracking-tight tabular-nums truncate"
              title={formatMoney(summary.grossRevenue, currency)}
            >
              {formatMoney(summary.grossRevenue, currency)}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground font-medium truncate">
            TRevPAR: <strong className="text-foreground font-mono">{formatMoney(summary.trevpar, currency)}</strong> / room
          </p>
          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        </div>

        {/* Net Operating Income */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="min-w-0">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span className="truncate">Net Operating Income</span>
              <span className="h-2 w-2 rounded-full bg-purple-500 shrink-0 ml-2" />
            </div>
            <div
              className="mt-2 font-mono text-xl sm:text-2xl 2xl:text-3xl font-black text-foreground tracking-tight tabular-nums truncate"
              title={formatMoney(summary.netRevenue, currency)}
            >
              {formatMoney(summary.netRevenue, currency)}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground font-medium truncate">
            Pre-tax hotel earnings excluding GST
          </p>
          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
        </div>

        {/* Statutory Indian GST Accrued */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="min-w-0">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span className="truncate">Statutory GST Collected</span>
              <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[9px] font-black text-amber-700 dark:text-amber-300 shrink-0 ml-2">
                12% / 18% / 5%
              </span>
            </div>
            <div
              className="mt-2 font-mono text-xl sm:text-2xl 2xl:text-3xl font-black text-foreground tracking-tight tabular-nums truncate"
              title={formatMoney(summary.totalGst, currency)}
            >
              {formatMoney(summary.totalGst, currency)}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground font-medium truncate">
            Dual-slab room &amp; dining tax for GSTR-1
          </p>
          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        </div>

        {/* Realized Collections & Cashiering */}
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="min-w-0">
            <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider">
              <span className="truncate">Realized Collections</span>
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 ml-2" />
            </div>
            <div
              className="mt-2 font-mono text-xl sm:text-2xl 2xl:text-3xl font-black text-foreground tracking-tight tabular-nums truncate"
              title={formatMoney(summary.totalPayments, currency)}
            >
              {formatMoney(summary.totalPayments, currency)}
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground font-medium truncate">
            City Ledger AR: <strong className="text-foreground font-mono">{formatMoney(summary.outstandingBalance, currency)}</strong>
          </p>
          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-sky-500" />
        </div>
      </div>

      {/* Secondary Benchmark Yield Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        {/* RevPAR */}
        <div className="rounded-2xl border border-slate-200/80 bg-muted/30/70 p-4 shadow-2xs min-w-0">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
            RevPAR (Room Yield)
          </div>
          <div
            className="mt-1 font-mono text-lg sm:text-xl 2xl:text-2xl font-black text-foreground tracking-tight tabular-nums truncate"
            title={formatMoney(summary.revpar, currency)}
          >
            {formatMoney(summary.revpar, currency)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            Revenue per available room night
          </p>
        </div>

        {/* ADR */}
        <div className="rounded-2xl border border-slate-200/80 bg-muted/30/70 p-4 shadow-2xs min-w-0">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
            ADR / ARR (Avg Rate)
          </div>
          <div
            className="mt-1 font-mono text-lg sm:text-xl 2xl:text-2xl font-black text-foreground tracking-tight tabular-nums truncate"
            title={formatMoney(summary.adr, currency)}
          >
            {formatMoney(summary.adr, currency)}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            Average realization per sold room
          </p>
        </div>

        {/* Occupancy % */}
        <div className="rounded-2xl border border-slate-200/80 bg-muted/30/70 p-4 shadow-2xs min-w-0">
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
            Average Occupancy
          </div>
          <div className="mt-1 font-mono text-lg sm:text-xl 2xl:text-2xl font-black text-foreground tracking-tight tabular-nums truncate">
            {summary.occupancyRate}%
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground truncate">
            {summary.roomsSold} nights of {summary.totalAvailableRooms * 24} keys
          </p>
        </div>
      </div>

      {/* 4. Interactive SVG Revenue Trend Graph */}
      <div className="rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">
              Revenue &amp; Income Trend Timeline
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Visual trajectory of accommodation turnover, F&amp;B dining, and net operating income over the selected period.
            </p>
          </div>

          {/* Graph View Toggles */}
          <div className="flex items-center gap-1.5 rounded-xl bg-muted/60 p-1 text-xs sm:text-sm font-bold text-muted-foreground print:hidden border border-border/80">
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`rounded-lg px-3.5 py-1.5 transition-all ${
                chartMode === 'stacked'
                  ? 'bg-card text-foreground shadow-xs border border-border/80 font-bold'
                  : 'hover:text-foreground'
              }`}
            >
              Stacked Turnover
            </button>
            <button
              type="button"
              onClick={() => setChartMode('gross_net')}
              className={`rounded-lg px-3.5 py-1.5 transition-all ${
                chartMode === 'gross_net'
                  ? 'bg-card text-foreground shadow-xs border border-border/80 font-bold'
                  : 'hover:text-foreground'
              }`}
            >
              Gross vs Net
            </button>
            <button
              type="button"
              onClick={() => setChartMode('yield')}
              className={`rounded-lg px-3.5 py-1.5 transition-all ${
                chartMode === 'yield'
                  ? 'bg-card text-foreground shadow-xs border border-border/80 font-bold'
                  : 'hover:text-foreground'
              }`}
            >
              ADR &amp; RevPAR
            </button>
          </div>
        </div>

        {/* SVG Interactive Chart */}
        <div className="mt-6 relative">
          {timeline.length === 0 ? (
            <div className="grid h-64 place-items-center text-sm font-semibold text-slate-400">
              No financial records in selected date range.
            </div>
          ) : (
            <div className="w-full overflow-x-auto">
              <div className="min-w-[640px]">
                {/* Chart Area */}
                <svg
                  viewBox={`0 0 ${timeline.length * 50 + 60} 240`}
                  className="w-full h-64 overflow-visible"
                >
                  <defs>
                    <linearGradient id="barRoomGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#6366f1" />
                    </linearGradient>
                    <linearGradient id="barFnbGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#059669" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                    <linearGradient id="barOtherGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d97706" />
                      <stop offset="100%" stopColor="#f59e0b" />
                    </linearGradient>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9333ea" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                    const y = 200 - pct * 170;
                    const val = chartMode === 'yield' ? maxYield * pct : maxGross * pct;
                    return (
                      <g key={idx}>
                        <line
                          x1="40"
                          y1={y}
                          x2={timeline.length * 50 + 40}
                          y2={y}
                          stroke="#e2e8f0"
                          strokeDasharray="4 4"
                          strokeWidth="1"
                        />
                        <text
                          x="35"
                          y={y + 3}
                          fontSize="9"
                          textAnchor="end"
                          fill="#94a3b8"
                          fontWeight="600"
                          className="font-mono"
                        >
                          {chartMode === 'yield'
                            ? `₹${Math.round(val / 1000)}k`
                            : val >= 10000000
                            ? `₹${(val / 10000000).toFixed(1)}Cr`
                            : val >= 100000
                            ? `₹${(val / 100000).toFixed(1)}L`
                            : `₹${Math.round(val / 1000)}k`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Bars & Interactive Points */}
                  {timeline.map((point, idx) => {
                    const x = 50 + idx * 50;
                    const isHovered = hoveredPointIndex === idx;

                    if (chartMode === 'yield') {
                      // ADR & RevPAR comparison bars
                      const adrH = Math.max(4, (point.adr / maxYield) * 170);
                      const revparH = Math.max(4, (point.revpar / maxYield) * 170);
                      return (
                        <g
                          key={point.key}
                          onMouseEnter={() => setHoveredPointIndex(idx)}
                          onMouseLeave={() => setHoveredPointIndex(null)}
                          className="cursor-pointer transition-opacity"
                        >
                          <rect
                            x={x - 14}
                            y={200 - adrH}
                            width="12"
                            height={adrH}
                            rx="3"
                            fill="#3b82f6"
                            className={isHovered ? 'brightness-110' : ''}
                          />
                          <rect
                            x={x}
                            y={200 - revparH}
                            width="12"
                            height={revparH}
                            rx="3"
                            fill="#10b981"
                            className={isHovered ? 'brightness-110' : ''}
                          />
                          <text
                            x={x - 1}
                            y="218"
                            fontSize="9"
                            textAnchor="middle"
                            fill="#64748b"
                            fontWeight="600"
                          >
                            {point.label}
                          </text>
                        </g>
                      );
                    }

                    if (chartMode === 'gross_net') {
                      // Gross vs Net Comparison
                      const grossH = Math.max(4, (point.gross / maxGross) * 170);
                      const netH = Math.max(4, (point.net / maxGross) * 170);
                      return (
                        <g
                          key={point.key}
                          onMouseEnter={() => setHoveredPointIndex(idx)}
                          onMouseLeave={() => setHoveredPointIndex(null)}
                          className="cursor-pointer transition-opacity"
                        >
                          <rect
                            x={x - 14}
                            y={200 - grossH}
                            width="12"
                            height={grossH}
                            rx="3"
                            fill="#0f172a"
                            className={isHovered ? 'brightness-125' : ''}
                          />
                          <rect
                            x={x}
                            y={200 - netH}
                            width="12"
                            height={netH}
                            rx="3"
                            fill="url(#netGrad)"
                            className={isHovered ? 'brightness-125' : ''}
                          />
                          <text
                            x={x - 1}
                            y="218"
                            fontSize="9"
                            textAnchor="middle"
                            fill="#64748b"
                            fontWeight="600"
                          >
                            {point.label}
                          </text>
                        </g>
                      );
                    }

                    // Default: Stacked Turnover (Room + F&B + Other)
                    const totalH = Math.max(4, (point.gross / maxGross) * 170);
                    const roomH = point.gross > 0 ? (point.room / point.gross) * totalH : totalH;
                    const fnbH = point.gross > 0 ? (point.fnb / point.gross) * totalH : 0;
                    const otherH = Math.max(0, totalH - roomH - fnbH);

                    return (
                      <g
                        key={point.key}
                        onMouseEnter={() => setHoveredPointIndex(idx)}
                        onMouseLeave={() => setHoveredPointIndex(null)}
                        className="cursor-pointer"
                      >
                        {/* Hover Column Background */}
                        {isHovered && (
                          <rect
                            x={x - 16}
                            y="25"
                            width="32"
                            height="180"
                            rx="8"
                            fill="#f1f5f9"
                            opacity="0.8"
                          />
                        )}

                        {/* Room Bar */}
                        <rect
                          x={x - 11}
                          y={200 - roomH}
                          width="22"
                          height={roomH}
                          rx={fnbH === 0 && otherH === 0 ? 4 : 0}
                          fill="url(#barRoomGrad)"
                        />
                        {/* F&B Bar */}
                        {fnbH > 0 && (
                          <rect
                            x={x - 11}
                            y={200 - roomH - fnbH}
                            width="22"
                            height={fnbH}
                            rx={otherH === 0 ? 4 : 0}
                            fill="url(#barFnbGrad)"
                          />
                        )}
                        {/* Other Ancillary Bar */}
                        {otherH > 0 && (
                          <rect
                            x={x - 11}
                            y={200 - totalH}
                            width="22"
                            height={otherH}
                            rx="4"
                            fill="url(#barOtherGrad)"
                          />
                        )}

                        {/* Date Label */}
                        <text
                          x={x}
                          y="218"
                          fontSize="9"
                          textAnchor="middle"
                          fill={isHovered ? '#0f172a' : '#64748b'}
                          fontWeight={isHovered ? '800' : '600'}
                        >
                          {point.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Interactive Tooltip */}
                {hoveredPointIndex !== null && timeline[hoveredPointIndex] && (() => {
                  const pt = timeline[hoveredPointIndex];
                  return (
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-950 text-white p-3.5 shadow-xl animate-in fade-in duration-150 border border-slate-800">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 place-items-center rounded-xl bg-purple-500/20 text-purple-300 font-mono text-xs font-black">
                          {hoveredPointIndex + 1}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-2">
                            <span>{pt.label}</span>
                            <span className="text-slate-400 font-mono text-xs font-normal">({pt.date})</span>
                          </div>
                          <div className="text-[11px] text-slate-300 font-medium">
                            Occupancy: <strong className="text-emerald-400">{pt.occupancy}%</strong> ({pt.roomsSold} keys) · ADR: <strong className="text-white">{formatMoney(pt.adr, currency)}</strong> · RevPAR: <strong className="text-white">{formatMoney(pt.revpar, currency)}</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-xs font-mono">
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase block">Gross Income</span>
                          <strong className="text-emerald-400 text-sm">{formatMoney(pt.gross, currency)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase block">Net Yield</span>
                          <strong className="text-purple-300 text-sm">{formatMoney(pt.net, currency)}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 text-[10px] uppercase block">Room / F&amp;B</span>
                          <strong className="text-white text-xs">{formatMoney(pt.room, currency)} / {formatMoney(pt.fnb, currency)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-muted-foreground">
                  {chartMode === 'yield' ? (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" />
                        <span>ADR (Average Daily Rate)</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                        <span>RevPAR (Revenue Per Available Key)</span>
                      </span>
                    </>
                  ) : chartMode === 'gross_net' ? (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-slate-900" />
                        <span>Total Gross Billed Turnover</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-purple-600" />
                        <span>Net Operating Income (Pre-Tax)</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-indigo-600" />
                        <span>Rooms Revenue (Accommodation)</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" />
                        <span>Food &amp; Beverage (F&amp;B Dining)</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                        <span>Ancillary (Spa, Laundry, Fleet)</span>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. USALI Departmental Breakdown (Taj & ITC Hospitality Standard) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Rooms Department */}
        <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-black text-indigo-900 uppercase tracking-wider">
              Rooms Department ({departments.rooms.pct}%)
            </span>
            <span className="text-xl">🛏️</span>
          </div>
          <div className="mt-3 font-mono text-2xl font-black text-indigo-950">
            {formatMoney(departments.rooms.gross, currency)}
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground font-medium">
            <div className="flex justify-between">
              <span>Net Operating Yield:</span>
              <strong className="text-foreground font-mono">{formatMoney(departments.rooms.net, currency)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Statutory GST (12%/18%):</span>
              <strong className="text-foreground font-mono">{formatMoney(departments.rooms.gst, currency)}</strong>
            </div>
          </div>
          <div className="mt-4 w-full bg-indigo-100 h-2 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${departments.rooms.pct}%` }} />
          </div>
        </div>

        {/* F&B Dining & Banquets */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/60 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-black text-emerald-900 uppercase tracking-wider">
              Food &amp; Beverage ({departments.fnb.pct}%)
            </span>
            <span className="text-xl">🍽️</span>
          </div>
          <div className="mt-3 font-mono text-2xl font-black text-emerald-950">
            {formatMoney(departments.fnb.gross, currency)}
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground font-medium">
            <div className="flex justify-between">
              <span>Restaurant &amp; In-Room Dining:</span>
              <strong className="text-foreground font-mono">{formatMoney(departments.fnb.net, currency)}</strong>
            </div>
            <div className="flex justify-between">
              <span>F&amp;B Statutory GST (5%):</span>
              <strong className="text-foreground font-mono">{formatMoney(departments.fnb.gst, currency)}</strong>
            </div>
          </div>
          <div className="mt-4 w-full bg-emerald-100 h-2 rounded-full overflow-hidden">
            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${departments.fnb.pct}%` }} />
          </div>
        </div>

        {/* Ancillary Services */}
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/60 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-black text-amber-900 uppercase tracking-wider">
              Ancillary &amp; Spa ({departments.other.pct}%)
            </span>
            <span className="text-xl">💆</span>
          </div>
          <div className="mt-3 font-mono text-2xl font-black text-amber-950">
            {formatMoney(departments.other.gross, currency)}
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground font-medium">
            <div className="flex justify-between">
              <span>Jiva/Kaya Spa &amp; Laundry:</span>
              <strong className="text-foreground font-mono">{formatMoney(departments.other.net, currency)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Services GST (18%):</span>
              <strong className="text-foreground font-mono">{formatMoney(departments.other.gst, currency)}</strong>
            </div>
          </div>
          <div className="mt-4 w-full bg-amber-100 h-2 rounded-full overflow-hidden">
            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${departments.other.pct}%` }} />
          </div>
        </div>
      </div>

      {/* 6. Distribution Channel Share & Tender Realization Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Distribution Channels */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs text-card-foreground">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-foreground font-display">
                Distribution Channel Contribution
              </h3>
              <p className="text-xs text-muted-foreground">
                Direct hotel bookings vs Corporate accounts vs OTA channels.
              </p>
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {channels.length} Channels
            </span>
          </div>

          <div className="mt-4 space-y-3.5">
            {channels.map((ch) => (
              <div key={ch.channel} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground">{ch.label}</span>
                    {ch.channel === 'direct' && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-950">
                        0% OTA Fee
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">
                      {formatMoney(ch.amount, currency)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-foreground/90">
                      {ch.sharePct}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      ch.channel === 'direct'
                        ? 'bg-emerald-500'
                        : ch.channel === 'corporate'
                        ? 'bg-purple-600'
                        : 'bg-indigo-500'
                    }`}
                    style={{ width: `${Math.max(4, ch.sharePct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Tender Realization */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs text-card-foreground">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-bold text-foreground font-display">
                Settled Payment Realization (Tenders)
              </h3>
              <p className="text-xs text-muted-foreground">
                Cashier collections by tender with Section 269ST &amp; Rule 114B guard.
              </p>
            </div>
            <span className="text-xs font-bold text-muted-foreground">
              {tenders.length} Tenders
            </span>
          </div>

          <div className="mt-4 space-y-3.5">
            {tenders.map((td) => (
              <div key={td.method} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-foreground">{td.label}</span>
                    {td.method === 'cash' && (
                      <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.2 text-[9px] font-bold text-rose-800">
                        &lt; ₹2L Guarded
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground">
                      {formatMoney(td.amount, currency)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-foreground/90">
                      {td.sharePct}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      td.method === 'upi'
                        ? 'bg-teal-500'
                        : td.method === 'card'
                        ? 'bg-blue-600'
                        : td.method === 'bank_transfer'
                        ? 'bg-purple-600'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.max(4, td.sharePct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7. Room Category Yield Contribution */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-xs text-card-foreground">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="font-bold text-foreground font-display">
              Room Category Yield Contribution
            </h3>
            <p className="text-xs text-muted-foreground">
              Revenue and ADR yield breakdown by suite and room class.
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground">
            {roomTypes.length} Room Types
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {roomTypes.map((rt) => (
            <div key={rt.roomType} className="rounded-xl border border-border bg-muted/20 p-4 min-w-0">
              <div className="flex items-center justify-between text-xs font-bold text-foreground gap-2">
                <span className="truncate">{rt.roomType}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] border shadow-2xs font-mono shrink-0">
                  {rt.sharePct}%
                </span>
              </div>
              <div className="mt-2 font-mono text-base sm:text-lg 2xl:text-xl font-black text-foreground tracking-tight tabular-nums truncate" title={formatMoney(rt.amount, currency)}>
                {formatMoney(rt.amount, currency)}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground font-medium gap-2">
                <span className="truncate">ADR: <strong className="text-foreground font-mono">{formatMoney(rt.adr, currency)}</strong></span>
                <span className="shrink-0">{rt.nightsSold} nights</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Day-by-Day Financial Ledger Table */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden shadow-xs text-card-foreground">
        <div className="p-5 border-b border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-foreground font-display">
              Day-by-Day Financial Audit Ledger
            </h3>
            <p className="text-xs text-muted-foreground">
              Complete audited daily breakdown of rooms sold, occupancy, room revenue, F&amp;B dining, and statutory GST.
            </p>
          </div>
          <div className="text-xs sm:text-sm font-bold text-foreground bg-card border border-border rounded-xl px-4 py-1.5 shadow-2xs">
            {ledgerRows.length} Audit Entries
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-[13px]">
            <thead className="bg-muted/40 text-[11px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
              <tr>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-3 py-3.5">Keys Sold</th>
                <th className="px-3 py-3.5">Occupancy</th>
                <th className="px-3 py-3.5">Room Rev (₹)</th>
                <th className="px-3 py-3.5">F&amp;B Rev (₹)</th>
                <th className="px-3 py-3.5">GST Tax (₹)</th>
                <th className="px-4 py-3.5">Gross Income (₹)</th>
                <th className="px-4 py-3.5">Net Operating (₹)</th>
                <th className="px-3 py-3.5">ADR (₹)</th>
                <th className="px-3 py-3.5">RevPAR (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-medium text-foreground">
              {ledgerRows.slice(0, 30).map((row) => (
                <tr key={row.date} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3.5 font-bold text-foreground">
                    <div>{row.date}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{row.dayName}</div>
                  </td>
                  <td className="px-3 py-3.5 font-mono text-foreground">{row.roomsSold}</td>
                  <td className="px-3 py-3.5">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                      row.occupancyRate >= 75
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : row.occupancyRate >= 50
                        ? 'border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}>
                      {row.occupancyRate}%
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono">{formatMoney(row.roomRevenue, currency)}</td>
                  <td className="px-3 py-3 font-mono">{formatMoney(row.fnbRevenue, currency)}</td>
                  <td className="px-3 py-3 font-mono text-amber-800">{formatMoney(row.taxCollected, currency)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-foreground">{formatMoney(row.grossRevenue, currency)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-purple-900">{formatMoney(row.netRevenue, currency)}</td>
                  <td className="px-3 py-3 font-mono text-muted-foreground">{formatMoney(row.adr, currency)}</td>
                  <td className="px-3 py-3 font-mono text-muted-foreground">{formatMoney(row.revpar, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )}

  {/* DOUBLE-ENTRY GENERAL LEDGER & FINANCIAL STATEMENTS VIEW */}
  {activeTab === 'general_ledger' && !hasAccountingGl && (
    <div className="rounded-3xl border border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50/60 via-white to-amber-50/40 dark:from-slate-900 dark:via-slate-950 dark:to-indigo-950/40 p-8 sm:p-12 text-center shadow-lg">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-3xl text-white shadow-md">
        💎
      </div>
      <span className="mt-4 inline-block rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 px-3.5 py-1 text-xs font-bold uppercase tracking-wider">
        Enterprise Chain Feature
      </span>
      <h2 className="mt-3 text-2xl font-black text-foreground dark:text-white font-display">
        Native Double-Entry General Ledger &amp; Certified Financial Statements
      </h2>
      <p className="mt-2 text-sm text-muted-foreground dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
        Eliminate reliance on external accounting exports. Unlock automatic journal vouchers, customizable Chart of Accounts, real-time Trial Balance, Profit &amp; Loss, and Balance Sheet reporting.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/upgrade?feature=hotel.accounting_gl"
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 text-xs font-bold shadow-md transition-all active:scale-[0.98]"
        >
          🚀 Upgrade to Enterprise Chain Plan
        </Link>
      </div>
    </div>
  )}

  {activeTab === 'general_ledger' && hasAccountingGl && (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">
            ✓ Double-Entry Standard General Ledger
          </span>
          <h2 className="text-xl font-bold mt-2 font-display">Financial Statements &amp; Audit Balance Sheets</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl">
            Live double-entry accounting ledger mapping cash registers, bank settlements, room revenues, and operating expenses. Direct internal P&amp;L and Balance Sheet with zero dependence on external accounting exports.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/settings?tab=accounting"
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition-all"
          >
            ⚙️ Manage Chart of Accounts
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-foreground px-4 py-2 text-xs font-bold shadow-md transition-all"
          >
            🖨️ Print Auditor P&amp;L Board Pack
          </button>
        </div>
      </div>

      {financialStatements ? (
        <div className="space-y-8">
          {/* 1. PROFIT & LOSS STATEMENT (P&L) */}
          <div className="rounded-3xl border border-border bg-card text-foreground p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Profit &amp; Loss Statement (Income Statement)</h3>
                <p className="text-xs text-muted-foreground">Operating revenues minus direct kitchen costs and operating expenses</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400">Net Operating Profit</span>
                <p className={`text-xl font-mono font-black ${financialStatements.profitAndLoss.netProfitOrLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatMoney(financialStatements.profitAndLoss.netProfitOrLoss, currency)}
                </p>
                <span className="text-[11px] font-bold text-muted-foreground">
                  {financialStatements.profitAndLoss.profitMarginPercent.toFixed(1)}% Operating Margin
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Revenue Column */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-muted/30 p-3 rounded-xl border border-slate-100 font-bold text-xs text-foreground">
                  <span>Operating Revenues</span>
                  <span className="font-mono text-emerald-700">{formatMoney(financialStatements.profitAndLoss.totalRevenue, currency)}</span>
                </div>
                <div className="divide-y divide-border text-xs">
                  {financialStatements.profitAndLoss.revenueItems.map((r: any) => (
                    <div key={r.id} className="py-2.5 flex justify-between items-center text-foreground/90">
                      <div>
                        <span className="font-mono text-[11px] text-slate-400 mr-2">{r.accountCode}</span>
                        <span>{r.accountName}</span>
                      </div>
                      <span className="font-mono font-semibold">{formatMoney(r.currentBalance, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Expense Column */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-muted/30 p-3 rounded-xl border border-slate-100 font-bold text-xs text-foreground">
                  <span>Operating Expenses</span>
                  <span className="font-mono text-rose-700">{formatMoney(financialStatements.profitAndLoss.totalExpenses, currency)}</span>
                </div>
                <div className="divide-y divide-border text-xs">
                  {financialStatements.profitAndLoss.expenseItems.map((e: any) => (
                    <div key={e.id} className="py-2.5 flex justify-between items-center text-foreground/90">
                      <div>
                        <span className="font-mono text-[11px] text-slate-400 mr-2">{e.accountCode}</span>
                        <span>{e.accountName}</span>
                      </div>
                      <span className="font-mono font-semibold">{formatMoney(e.currentBalance, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. CERTIFIED BALANCE SHEET */}
          <div className="rounded-3xl border border-border bg-card text-foreground p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">Certified Balance Sheet</h3>
                <p className="text-xs text-muted-foreground">Financial position: Total Assets = Total Liabilities + Equity</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  financialStatements.balanceSheet.isBalanced
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}>
                  {financialStatements.balanceSheet.isBalanced ? '✓ Equation Balanced (A = L + E)' : '⚠️ Balance Discrepancy'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Assets Column */}
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-blue-50/60 p-3 rounded-xl border border-blue-100 font-bold text-xs text-blue-950">
                  <span>Total Current &amp; Fixed Assets</span>
                  <span className="font-mono">{formatMoney(financialStatements.balanceSheet.totalAssets, currency)}</span>
                </div>
                <div className="divide-y divide-border text-xs">
                  {financialStatements.balanceSheet.assetItems.map((a: any) => (
                    <div key={a.id} className="py-2.5 flex justify-between items-center text-foreground/90">
                      <div>
                        <span className="font-mono text-[11px] text-slate-400 mr-2">{a.accountCode}</span>
                        <span>{a.accountName}</span>
                        {a.subCategory && <span className="text-[10px] text-slate-400 ml-1.5">({a.subCategory})</span>}
                      </div>
                      <span className="font-mono font-semibold">{formatMoney(a.currentBalance, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Liabilities & Equity Column */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-amber-50/60 p-3 rounded-xl border border-amber-100 font-bold text-xs text-amber-950">
                    <span>Liabilities (Duties, Taxes &amp; Payables)</span>
                    <span className="font-mono">{formatMoney(financialStatements.balanceSheet.totalLiabilities, currency)}</span>
                  </div>
                  <div className="divide-y divide-border text-xs">
                    {financialStatements.balanceSheet.liabilityItems.map((l: any) => (
                      <div key={l.id} className="py-2 flex justify-between items-center text-foreground/90">
                        <div>
                          <span className="font-mono text-[11px] text-slate-400 mr-2">{l.accountCode}</span>
                          <span>{l.accountName}</span>
                        </div>
                        <span className="font-mono font-semibold">{formatMoney(l.currentBalance, currency)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center bg-purple-50/60 p-3 rounded-xl border border-purple-100 font-bold text-xs text-purple-950">
                    <span>Equity &amp; Retained Earnings</span>
                    <span className="font-mono">{formatMoney(financialStatements.balanceSheet.totalEquity, currency)}</span>
                  </div>
                  <div className="divide-y divide-border text-xs">
                    {financialStatements.balanceSheet.equityItems.map((eq: any) => (
                      <div key={eq.id} className="py-2 flex justify-between items-center text-foreground/90">
                        <div>
                          <span className="font-mono text-[11px] text-slate-400 mr-2">{eq.accountCode}</span>
                          <span>{eq.accountName}</span>
                        </div>
                        <span className="font-mono font-semibold">{formatMoney(eq.currentBalance, currency)}</span>
                      </div>
                    ))}
                    <div className="py-2 flex justify-between items-center text-emerald-800 font-semibold">
                      <span>+ Current Period Operating Net Profit</span>
                      <span className="font-mono">{formatMoney(financialStatements.profitAndLoss.netProfitOrLoss, currency)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. TRIAL BALANCE */}
          <div className="rounded-3xl border border-border bg-card text-foreground p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Trial Balance Verification Ledger</h3>
                <p className="text-xs text-muted-foreground">Every debit and credit line mathematically verified</p>
              </div>
              <div className="font-mono text-xs font-bold text-foreground/90 flex items-center gap-4">
                <span>Total Debit: <strong>{formatMoney(financialStatements.trialBalance.totalDebit, currency)}</strong></span>
                <span>Total Credit: <strong>{formatMoney(financialStatements.trialBalance.totalCredit, currency)}</strong></span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/30 text-[11px] font-bold uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Account Name</th>
                    <th className="px-3 py-2">Category Type</th>
                    <th className="px-3 py-2 text-right">Debit Balance</th>
                    <th className="px-3 py-2 text-right">Credit Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {financialStatements.trialBalance.items.map((tb: any) => (
                    <tr key={tb.accountCode} className="hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono font-bold text-slate-800">{tb.accountCode}</td>
                      <td className="px-3 py-2 font-medium text-foreground">{tb.accountName}</td>
                      <td className="px-3 py-2 text-muted-foreground">{tb.accountType}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground/90">{tb.debit > 0 ? formatMoney(tb.debit, currency) : '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground/90">{tb.credit > 0 ? formatMoney(tb.credit, currency) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
          Double-entry ledger not initialized. Go to Settings &gt; Chart of Accounts to verify configuration.
        </div>
      )}
    </div>
  )}
    </div>
  );
}
