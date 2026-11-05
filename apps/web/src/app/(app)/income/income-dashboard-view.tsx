'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatMoney } from '@/lib/format';
import type { IncomeReportDto } from './types';

export function IncomeDashboardView({
  initialData,
  propertyName,
  role,
}: {
  initialData: IncomeReportDto;
  propertyName: string;
  role: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 border border-purple-300 px-3 py-0.5 text-xs font-black text-purple-950 uppercase tracking-wider shadow-2xs">
              <span>👑</span>
              <span>Owner &amp; Board Confidential</span>
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Taj / ITC Luxury Protocol</span>
            </span>
          </div>

          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight font-display">
            Executive Income &amp; Revenue Analytics
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 font-medium">
            Proprietary P&amp;L and revenue intelligence for <strong>{propertyName}</strong>. Track daily, weekly, monthly, quarterly, and annual hotel turnover.
          </p>
        </div>

        {/* Executive Actions */}
        <div className="flex items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-400 transition-all active:scale-95"
            title="Generate print-ready Executive Board Pack & P&L Statement"
          >
            <svg className="h-4 w-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4H9v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Board Pack</span>
          </button>

          <button
            type="button"
            onClick={() => applyPeriod(activePeriod)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 transition-all active:scale-95"
          >
            <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Live Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Interactive Period & Calendar Selection Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm print:hidden">
        <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
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
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                    active
                      ? 'bg-slate-950 text-white shadow-xs'
                      : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Active Period Date Badge */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 self-start lg:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Auditing:</span>
            <strong className="text-slate-900 font-mono">
              {initialData.startDate}
            </strong>
            <span>→</span>
            <strong className="text-slate-900 font-mono">
              {initialData.endDate}
            </strong>
          </div>
        </div>

        {/* Sub-Controls: Daily Date Picker */}
        {activePeriod === 'daily' && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
              <span>Select Date:</span>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => {
                  setDailyDate(e.target.value);
                  applyPeriod('daily', { date: e.target.value });
                }}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
              />
            </label>

            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10);
                setDailyDate(today);
                applyPeriod('daily', { date: today });
              }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
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
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Yesterday
            </button>
          </div>
        )}

        {/* Sub-Controls: Custom Date Range Picker */}
        {activePeriod === 'custom' && (
          <div className="mt-3.5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">From:</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">To:</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-2xs"
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
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Revenue */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Gross Revenue (Income)</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-slate-950">
            {formatMoney(summary.grossRevenue, currency)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 font-medium">
            TRevPAR: <strong className="text-slate-900 font-mono">{formatMoney(summary.trevpar, currency)}</strong> / room
          </p>
          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        </div>

        {/* Net Operating Income */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Net Operating Income</span>
            <span className="h-2 w-2 rounded-full bg-purple-500" />
          </div>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-purple-950">
            {formatMoney(summary.netRevenue, currency)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 font-medium">
            Pre-tax hotel earnings excluding GST
          </p>
          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
        </div>

        {/* Statutory Indian GST Accrued */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Statutory GST Collected</span>
            <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[9px] font-black text-amber-900">
              12% / 18% / 5%
            </span>
          </div>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-amber-950">
            {formatMoney(summary.totalGst, currency)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 font-medium">
            Dual-slab room &amp; dining tax for GSTR-1
          </p>
          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
        </div>

        {/* Realized Collections & Cashiering */}
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Realized Collections</span>
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2 font-mono text-2xl sm:text-3xl font-black text-blue-950">
            {formatMoney(summary.totalPayments, currency)}
          </div>
          <p className="mt-1.5 text-xs text-slate-500 font-medium truncate">
            City Ledger AR: <strong className="text-slate-900 font-mono">{formatMoney(summary.outstandingBalance, currency)}</strong>
          </p>
          <div className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-sky-500" />
        </div>
      </div>

      {/* Secondary Benchmark Yield Cards */}
      <div className="grid grid-cols-3 gap-3.5">
        {/* RevPAR */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            RevPAR (Room Yield)
          </div>
          <div className="mt-1 font-mono text-xl sm:text-2xl font-black text-slate-950">
            {formatMoney(summary.revpar, currency)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Revenue per available room night
          </p>
        </div>

        {/* ADR */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            ADR / ARR (Avg Rate)
          </div>
          <div className="mt-1 font-mono text-xl sm:text-2xl font-black text-slate-950">
            {formatMoney(summary.adr, currency)}
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Average realization per sold room
          </p>
        </div>

        {/* Occupancy % */}
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-2xs">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Average Occupancy
          </div>
          <div className="mt-1 font-mono text-xl sm:text-2xl font-black text-slate-950">
            {summary.occupancyRate}%
          </div>
          <p className="mt-1 text-[11px] text-slate-500 truncate">
            {summary.roomsSold} nights of {summary.totalAvailableRooms} keys
          </p>
        </div>
      </div>

      {/* 4. Interactive SVG Revenue Trend Graph (The Core Graph Requested by User!) */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950 font-display">
              Revenue &amp; Income Trend Timeline
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Visual trajectory of accommodation turnover, F&amp;B dining, and net operating income over the selected period.
            </p>
          </div>

          {/* Graph View Toggles */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600 print:hidden">
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`rounded-lg px-3 py-1 transition-all ${
                chartMode === 'stacked'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Stacked Turnover
            </button>
            <button
              type="button"
              onClick={() => setChartMode('gross_net')}
              className={`rounded-lg px-3 py-1 transition-all ${
                chartMode === 'gross_net'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'hover:text-slate-900'
              }`}
            >
              Gross vs Net
            </button>
            <button
              type="button"
              onClick={() => setChartMode('yield')}
              className={`rounded-lg px-3 py-1 transition-all ${
                chartMode === 'yield'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'hover:text-slate-900'
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
                <div className="mt-4 flex flex-wrap items-center justify-center gap-5 text-xs font-semibold text-slate-600">
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
          <div className="mt-3 space-y-1.5 text-xs text-slate-600 font-medium">
            <div className="flex justify-between">
              <span>Net Operating Yield:</span>
              <strong className="text-slate-900 font-mono">{formatMoney(departments.rooms.net, currency)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Statutory GST (12%/18%):</span>
              <strong className="text-slate-900 font-mono">{formatMoney(departments.rooms.gst, currency)}</strong>
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
          <div className="mt-3 space-y-1.5 text-xs text-slate-600 font-medium">
            <div className="flex justify-between">
              <span>Restaurant &amp; In-Room Dining:</span>
              <strong className="text-slate-900 font-mono">{formatMoney(departments.fnb.net, currency)}</strong>
            </div>
            <div className="flex justify-between">
              <span>F&amp;B Statutory GST (5%):</span>
              <strong className="text-slate-900 font-mono">{formatMoney(departments.fnb.gst, currency)}</strong>
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
          <div className="mt-3 space-y-1.5 text-xs text-slate-600 font-medium">
            <div className="flex justify-between">
              <span>Jiva/Kaya Spa &amp; Laundry:</span>
              <strong className="text-slate-900 font-mono">{formatMoney(departments.other.net, currency)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Services GST (18%):</span>
              <strong className="text-slate-900 font-mono">{formatMoney(departments.other.gst, currency)}</strong>
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
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-950 font-display">
                Distribution Channel Contribution
              </h3>
              <p className="text-xs text-slate-500">
                Direct hotel bookings vs Corporate accounts vs OTA channels.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {channels.length} Channels
            </span>
          </div>

          <div className="mt-4 space-y-3.5">
            {channels.map((ch) => (
              <div key={ch.channel} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-900">{ch.label}</span>
                    {ch.channel === 'direct' && (
                      <span className="rounded bg-emerald-100 px-1.5 py-0.2 text-[9px] font-black text-emerald-950">
                        0% OTA Fee
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-950">
                      {formatMoney(ch.amount, currency)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
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
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-950 font-display">
                Settled Payment Realization (Tenders)
              </h3>
              <p className="text-xs text-slate-500">
                Cashier collections by tender with Section 269ST &amp; Rule 114B guard.
              </p>
            </div>
            <span className="text-xs font-bold text-slate-500">
              {tenders.length} Tenders
            </span>
          </div>

          <div className="mt-4 space-y-3.5">
            {tenders.map((td) => (
              <div key={td.method} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-900">{td.label}</span>
                    {td.method === 'cash' && (
                      <span className="rounded bg-rose-50 border border-rose-200 px-1.5 py-0.2 text-[9px] font-bold text-rose-800">
                        &lt; ₹2L Guarded
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-950">
                      {formatMoney(td.amount, currency)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
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
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-950 font-display">
              Room Category Yield Contribution
            </h3>
            <p className="text-xs text-slate-500">
              Revenue and ADR yield breakdown by suite and room class.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">
            {roomTypes.length} Room Types
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {roomTypes.map((rt) => (
            <div key={rt.roomType} className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
              <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                <span className="truncate">{rt.roomType}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] border shadow-2xs font-mono">
                  {rt.sharePct}%
                </span>
              </div>
              <div className="mt-2 font-mono text-lg font-black text-slate-950">
                {formatMoney(rt.amount, currency)}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>ADR: <strong className="text-slate-900 font-mono">{formatMoney(rt.adr, currency)}</strong></span>
                <span>{rt.nightsSold} nights</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Day-by-Day Financial Ledger Table */}
      <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-950 font-display">
              Day-by-Day Financial Audit Ledger
            </h3>
            <p className="text-xs text-slate-500">
              Complete audited daily breakdown of rooms sold, occupancy, room revenue, F&amp;B dining, and statutory GST.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 rounded-xl px-3 py-1">
            {ledgerRows.length} Audit Entries
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200/80">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-3 py-3">Keys Sold</th>
                <th className="px-3 py-3">Occupancy</th>
                <th className="px-3 py-3">Room Rev (₹)</th>
                <th className="px-3 py-3">F&amp;B Rev (₹)</th>
                <th className="px-3 py-3">GST Tax (₹)</th>
                <th className="px-4 py-3">Gross Income (₹)</th>
                <th className="px-4 py-3">Net Operating (₹)</th>
                <th className="px-3 py-3">ADR (₹)</th>
                <th className="px-3 py-3">RevPAR (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {ledgerRows.slice(0, 30).map((row) => (
                <tr key={row.date} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-950">
                    <div>{row.date}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{row.dayName}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-900">{row.roomsSold}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      row.occupancyRate >= 75
                        ? 'bg-emerald-100 text-emerald-900'
                        : row.occupancyRate >= 50
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-amber-100 text-amber-900'
                    }`}>
                      {row.occupancyRate}%
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono">{formatMoney(row.roomRevenue, currency)}</td>
                  <td className="px-3 py-3 font-mono">{formatMoney(row.fnbRevenue, currency)}</td>
                  <td className="px-3 py-3 font-mono text-amber-800">{formatMoney(row.taxCollected, currency)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-950">{formatMoney(row.grossRevenue, currency)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-purple-900">{formatMoney(row.netRevenue, currency)}</td>
                  <td className="px-3 py-3 font-mono text-slate-600">{formatMoney(row.adr, currency)}</td>
                  <td className="px-3 py-3 font-mono text-slate-600">{formatMoney(row.revpar, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
