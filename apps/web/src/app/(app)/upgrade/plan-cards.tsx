'use client';

import { useTransition, useState } from 'react';
import type { FeatureKey, PlanKey, PlanTierConfig } from '@erp/shared';
import { FEATURE_LABELS } from '@/lib/features';
import { btnCls, btnGhostCls } from '@/components/ui';
import { switchPlanAction } from './actions';
import { RazorpayCheckoutModal } from './razorpay-checkout-modal';
import { SaasInvoiceModal, type SaasInvoiceRecord } from './saas-invoice-modal';

interface PlanCardsProps {
  tiers: readonly PlanTierConfig[];
  currentPlan: PlanKey | null;
  isOwner: boolean;
  highlightFeature?: string;
  subDetails?: {
    subscription: {
      planKey: string;
      status: string;
      trialEndsAt: string | null;
      currentPeriodEnd: string | null;
      createdAt: string;
    };
    tenant: {
      name: string;
      slug: string;
      contactEmail: string | null;
      contactPhone: string | null;
      billingCycle: string | null;
    };
    invoices: SaasInvoiceRecord[];
    usage: {
      roomsCount: number;
      staffCount: number;
      maxRooms: number | null;
      maxStaff: number | null;
    };
    currentTier: PlanTierConfig;
    razorpayKeyId: string;
  } | null;
  hotelName?: string;
  customerEmail?: string;
  customerName?: string;
}

export function PlanCards({
  tiers,
  currentPlan,
  isOwner,
  highlightFeature,
  subDetails,
  hotelName = 'Grand Azure Hotel',
  customerEmail,
  customerName,
}: PlanCardsProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Modals state
  const [checkoutTier, setCheckoutTier] = useState<PlanTierConfig | null>(null);
  const [viewInvoice, setViewInvoice] = useState<SaasInvoiceRecord | null>(null);

  // Normalize aliases: basic -> starter, plus -> growth
  const normalizedCurrent = currentPlan === 'basic' ? 'starter' : currentPlan === 'plus' ? 'growth' : currentPlan;

  const currentStatus = subDetails?.subscription?.status || 'active';
  const isPastDue = currentStatus === 'past_due';

  const handleSimulate = async (action: 'charge_success' | 'payment_failed' | 'cancel' | 'reactivate') => {
    setIsSimulating(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/subscription/simulate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Simulation failed');
      setSuccess(data.message);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setError(err?.message || 'Simulation error');
      setIsSimulating(false);
    }
  };

  // Feature comparison matrix definitions
  const matrixCategories: {
    category: string;
    rows: { label: string; featureKey?: FeatureKey; starter: string | boolean; growth: string | boolean; enterprise: string | boolean; description: string }[];
  }[] = [
    {
      category: 'Capacity & Scale',
      rows: [
        { label: 'Room Inventory Limit', starter: '25 Rooms', growth: '80 Rooms', enterprise: 'Unlimited', description: 'Maximum number of bookable hotel rooms allowed in the property' },
        { label: 'Staff User Logins', starter: '3 Staff', growth: '15 Staff', enterprise: 'Unlimited', description: 'Simultaneous staff member logins with individual audit tracking' },
        { label: 'Multi-Property Switching', starter: false, growth: false, enterprise: true, description: 'Single organization portfolio dashboard to manage multiple hotels & palaces' },
      ],
    },
    {
      category: 'Front Desk & Rack Operations',
      rows: [
        { label: 'Visual Tape Chart Gantt Rack', featureKey: 'hotel.tape_chart', starter: true, growth: true, enterprise: true, description: 'Drag-and-drop timeline room rack for visual check-in and inventory blocks' },
        { label: 'Walk-in & Direct Bookings', featureKey: 'hotel.reservations', starter: true, growth: true, enterprise: true, description: 'Fast front-desk walk-in creation and instant stay management' },
        { label: 'Housekeeping Turn Board', featureKey: 'hotel.housekeeping', starter: false, growth: true, enterprise: true, description: 'Room cleaning tracking (dirty / clean / inspected) and maid room assignment' },
        { label: 'RFID Keycard Door Lock Integration', featureKey: 'hotel.keycards', starter: false, growth: false, enterprise: true, description: 'Direct encoder API for Assa Abloy, Salto, and Dormakaba hotel locks' },
      ],
    },
    {
      category: 'Indian Statutory & Billing Compliance',
      rows: [
        { label: 'Daily Police Beat Sheet', featureKey: 'hotel.compliance', starter: true, growth: true, enterprise: true, description: 'Statutory guest arrival/departure register for local police station verification' },
        { label: 'Cash & UPI Cashiering', featureKey: 'hotel.billing', starter: true, growth: true, enterprise: true, description: 'Quick payment collection with instant receipt generation' },
        { label: 'Dual-Slab Indian GST Invoicing', featureKey: 'hotel.billing', starter: false, growth: true, enterprise: true, description: 'Statutory 12% (< ₹7,500) and 18% (> ₹7,500) GST with SAC 996311 / 996331 codes' },
        { label: 'BoI Form C Foreigner Filing', featureKey: 'hotel.compliance', starter: false, growth: true, enterprise: true, description: 'Bureau of Immigration portal export for foreign tourists under Rule 14' },
        { label: 'Corporate City Ledger & B2B AR', featureKey: 'hotel.corporate_ledger', starter: false, growth: false, enterprise: true, description: 'Corporate master credit billing with 30/60/90 day accounts receivable aging' },
        { label: 'Section 269ST Cash Freeze (₹2 Lakh)', starter: false, growth: false, enterprise: true, description: 'Income Tax compliance preventing cash collection equal or exceeding ₹2,00,000' },
        { label: 'NIC E-Invoicing & Signed QR Codes', starter: false, growth: false, enterprise: true, description: 'Statutory B2B Invoice Reference Number (IRN) and digitally signed QR verification' },
      ],
    },
    {
      category: 'Revenue & Night Audit',
      rows: [
        { label: 'Daily Night Audit & Business Rollover', featureKey: 'hotel.night_audit', starter: false, growth: true, enterprise: true, description: 'Automated midnight room & tax posting, rate verification, and business date advance' },
        { label: 'ADR, RevPAR & Occupancy KPIs', featureKey: 'hotel.reports_basic', starter: false, growth: true, enterprise: true, description: 'Managerial flash reports and operational efficiency metrics' },
        { label: '2-Way Channel Manager Sync', featureKey: 'hotel.channel_manager', starter: false, growth: false, enterprise: true, description: 'Automated live rate and inventory parity across MakeMyTrip, Agoda & Booking.com' },
        { label: 'Central Reservation System (CRS)', featureKey: 'hotel.crs', starter: false, growth: false, enterprise: true, description: 'Centralized chain-wide reservation desk and call center booking' },
        { label: 'Multi-Outlet F&B POS (KOT / KDS)', featureKey: 'hotel.pos', starter: false, growth: false, enterprise: true, description: 'Touchscreen POS for restaurants, bars, and banquets with kitchen order tickets' },
        { label: 'Central Guest Loyalty & Recognition', featureKey: 'hotel.loyalty', starter: false, growth: false, enterprise: true, description: 'Single Customer View (SCV), lifetime stays, and VIP guest tier recognition' },
        { label: 'Enterprise SSO & Audit Trail Export', featureKey: 'core.sso', starter: false, growth: false, enterprise: true, description: 'SAML 2.0 / Okta / Azure AD identity integration and regulatory audit trail dumps' },
      ],
    },
  ];

  return (
    <div className="space-y-12">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
          <strong>Error:</strong> {error}
        </div>
      )}
      {success && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300">
          <strong>Success:</strong> {success}
        </div>
      )}

      {/* Active Subscription Overview Card */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-lagoon-soft text-xl">
              🏨
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-ink">
                  {subDetails?.tenant?.name || hotelName}
                </h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                    isPastDue
                      ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300'
                      : currentStatus === 'trialing'
                      ? 'bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                  }`}
                >
                  ● {currentStatus === 'past_due' ? 'Past Due (Grace Period)' : currentStatus.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Current Plan: <strong className="text-ink capitalize">{subDetails?.subscription?.planKey || normalizedCurrent || 'Growth'}</strong>
                {subDetails?.subscription?.currentPeriodEnd && (
                  <> · Next auto-debit renewal: <strong>{new Date(subDetails.subscription.currentPeriodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong></>
                )}
              </p>
            </div>
          </div>

          {/* Usage Meters */}
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="rounded-xl border border-line bg-ground px-3.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Room Inventory</p>
              <p className="font-display text-sm font-bold text-ink mt-0.5">
                {subDetails?.usage?.roomsCount ?? 12} / {subDetails?.usage?.maxRooms ? `${subDetails.usage.maxRooms} keys` : '∞ unlimited'}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-ground px-3.5 py-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Staff Logins</p>
              <p className="font-display text-sm font-bold text-ink mt-0.5">
                {subDetails?.usage?.staffCount ?? 3} / {subDetails?.usage?.maxStaff ? `${subDetails.usage.maxStaff} seats` : '∞ unlimited'}
              </p>
            </div>
          </div>
        </div>

        {/* Past Due Grace Period Alert */}
        {isPastDue && (
          <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>
                  <strong>Payment Mandate Past Due:</strong> Your property is currently operating in read-only grace period. Re-authorize your auto-debit mandate to restore instant write permissions.
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSimulate('charge_success')}
                className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
              >
                Pay & Restore Active
              </button>
            </div>
          </div>
        )}

        {/* Demo Mandate Simulation Toolbar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-ground/80 p-3 text-xs">
          <span className="font-bold text-muted flex items-center gap-1.5">
            <span>🧪</span>
            <span>SaaS Billing Testing Toolbar:</span>
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => handleSimulate('charge_success')}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-300"
              title="Simulates bank recurring payment webhook, advances period by 30 days and generates tax invoice"
            >
              ⚡ Simulate Auto-Debit (+30d)
            </button>
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => handleSimulate('payment_failed')}
              className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-300"
              title="Simulates payment failure putting the property in past-due read-only grace period"
            >
              ⚠️ Simulate Payment Failure
            </button>
            <button
              type="button"
              disabled={isSimulating}
              onClick={() => handleSimulate('reactivate')}
              className="rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink hover:bg-ground"
            >
              🔄 Restore Active
            </button>
          </div>
        </div>
      </div>

      {/* 3 Tier Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {(tiers ?? []).map((tier) => {
          const isCurrent = normalizedCurrent === tier.key;
          const isEnterprise = tier.key === 'enterprise';
          const isGrowth = tier.key === 'growth';

          return (
            <div
              key={tier.key}
              className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-200 shadow-sm sm:p-8 ${
                isEnterprise
                  ? 'border-amber-400/60 bg-gradient-to-b from-amber-500/[.07] via-surface to-surface ring-1 ring-amber-400/40'
                  : isGrowth
                  ? 'border-teal-500/50 bg-gradient-to-b from-teal-500/[.05] via-surface to-surface ring-1 ring-teal-500/30'
                  : 'border-line bg-surface'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-xl font-bold tracking-tight text-ink">
                    {tier.name.split('(')[0].trim()}
                  </h3>
                  {tier.badge && (
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                        isEnterprise
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                          : 'bg-teal-100 text-teal-800 dark:bg-teal-950/70 dark:text-teal-300'
                      }`}
                    >
                      {tier.badge}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs font-medium text-muted">
                  {tier.targetSegment}
                </p>

                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-3xl font-extrabold tracking-tight text-ink">
                    ₹{tier.monthlyPriceInr.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs font-semibold text-muted">/ month</span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-md border border-line bg-ground px-2.5 py-1 font-semibold text-ink">
                    🛏️ {tier.maxRooms ? `Up to ${tier.maxRooms} Rooms` : 'Unlimited Rooms'}
                  </span>
                  <span className="rounded-md border border-line bg-ground px-2.5 py-1 font-semibold text-ink">
                    👥 {tier.maxStaff ? `Up to ${tier.maxStaff} Staff` : 'Unlimited Staff'}
                  </span>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-muted">
                  {tier.tagline}
                </p>

                <div className="mt-6 border-t border-line/60 pt-5">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    Key Capabilities Included
                  </p>
                  <ul className="mt-3 space-y-2 text-xs text-ink/90">
                    {tier.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600 dark:text-teal-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-8 pt-4">
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full rounded-xl border border-line bg-ground/80 py-2.5 text-center text-xs font-bold text-muted cursor-default"
                  >
                    ✓ Current Active Plan
                  </button>
                ) : isOwner ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setCheckoutTier(tier as PlanTierConfig)}
                    className={`w-full rounded-xl py-2.5 text-center text-xs font-bold shadow-sm transition-all duration-150 disabled:opacity-50 ${
                      isEnterprise
                        ? 'bg-amber-600 text-white hover:bg-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500'
                        : isGrowth
                        ? 'bg-teal-600 text-white hover:bg-teal-500 focus-visible:ring-2 focus-visible:ring-teal-500'
                        : 'border border-line bg-surface text-ink hover:bg-ground'
                    }`}
                  >
                    {isPending ? 'Updating Subscription…' : `Subscribe to ${tier.name.split('(')[0].trim()} →`}
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full rounded-xl border border-line bg-ground/60 py-2.5 text-center text-xs font-medium text-muted"
                  >
                    Owner Role Required to Switch
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Matrix Table */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div>
          <h3 className="font-display text-xl font-bold tracking-tight text-ink">
            Detailed Hospitality Comparison: Small Hotels vs. Luxury Hotel Chains
          </h3>
          <p className="mt-1 text-xs text-muted">
            See how features and regulatory controls differ between homestays/budget properties and luxury enterprise chains like Taj, Oberoi, and ITC.
          </p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-3 pr-4 font-semibold">Features & Statutory Controls</th>
                <th className="px-4 py-3 font-semibold text-center w-36">Starter (Small Hotel)</th>
                <th className="px-4 py-3 font-semibold text-center w-36">Growth (Resort)</th>
                <th className="px-4 py-3 font-semibold text-center w-40 text-amber-600 dark:text-amber-400">Enterprise (Taj Chain)</th>
              </tr>
            </thead>
            <tbody>
              {matrixCategories.map((cat, catIdx) => (
                <div key={catIdx} className="contents">
                  <tr className="border-b border-line/60 bg-ground/50">
                    <td colSpan={4} className="py-2.5 px-2 font-bold uppercase tracking-wider text-[11px] text-muted">
                      {cat.category}
                    </td>
                  </tr>
                  {cat.rows.map((row, rowIdx) => {
                    const isHighlighted = highlightFeature && row.featureKey === highlightFeature;
                    return (
                      <tr
                        key={rowIdx}
                        className={`border-b border-line/40 transition-colors ${
                          isHighlighted ? 'bg-amber-500/10 font-medium' : 'hover:bg-ground/40'
                        }`}
                      >
                        <td className="py-3 pr-4">
                          <div className="font-semibold text-ink">{row.label}</div>
                          <div className="text-[11px] text-muted">{row.description}</div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {renderCell(row.starter)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {renderCell(row.growth)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {renderCell(row.enterprise)}
                        </td>
                      </tr>
                    );
                  })}
                </div>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SaaS Subscription Tax Invoices (GST ITC Ledger) */}
      <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div>
            <h3 className="font-display text-lg font-bold text-ink">
              SaaS Subscription Tax Invoices (GST ITC Ledger)
            </h3>
            <p className="mt-0.5 text-xs text-muted">
              Official computer-generated GST tax receipts (SAC 998314) for accounting and Input Tax Credit claims.
            </p>
          </div>
          <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
            ✓ 18% GST Compliant
          </span>
        </div>

        {subDetails?.invoices && subDetails.invoices.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-ground text-[11px] font-bold uppercase tracking-wider text-muted">
                <tr>
                  <th className="p-3">Invoice Number</th>
                  <th className="p-3">Plan Edition</th>
                  <th className="p-3">Billing Period</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {subDetails.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-ground/50">
                    <td className="p-3 font-bold text-ink">{inv.invoiceNumber}</td>
                    <td className="p-3 capitalize text-ink">{inv.planKey}</td>
                    <td className="p-3 text-muted">
                      {new Date(inv.billingPeriodStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} — {new Date(inv.billingPeriodEnd).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-3 text-muted text-[11px]">
                      {inv.paymentMethod?.replace(/_/g, ' ') || 'Razorpay Mandate'}
                    </td>
                    <td className="p-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{Number(inv.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 text-center">
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                        ✓ PAID
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => setViewInvoice(inv)}
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-2xs hover:bg-ground"
                      >
                        <span>🖨️</span>
                        <span>View Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-muted">
            <p>No past subscription invoices generated yet for this property.</p>
            <p className="mt-1">When auto-debit payments are processed, statutory GST invoices will automatically appear here.</p>
          </div>
        )}
      </div>

      {/* Razorpay Checkout Modal */}
      {checkoutTier && (
        <RazorpayCheckoutModal
          isOpen={true}
          planKey={checkoutTier.key}
          planName={checkoutTier.name}
          monthlyPrice={checkoutTier.monthlyPriceInr}
          razorpayKeyId={subDetails?.razorpayKeyId || 'rzp_test_erp_saas_demo'}
          customerName={customerName}
          customerEmail={customerEmail}
          onClose={() => setCheckoutTier(null)}
          onSuccess={() => {
            setSuccess(`Subscription successfully upgraded to ${checkoutTier.name}! Entitlements refreshed.`);
            setCheckoutTier(null);
            setTimeout(() => window.location.reload(), 1200);
          }}
        />
      )}

      {/* Official SaaS Tax Invoice Modal */}
      {viewInvoice && (
        <SaasInvoiceModal
          invoice={viewInvoice}
          hotelName={hotelName}
          onClose={() => setViewInvoice(null)}
        />
      )}
    </div>
  );
}

function renderCell(val: string | boolean) {
  if (typeof val === 'string') {
    return <span className="font-semibold text-ink">{val}</span>;
  }
  if (val) {
    return (
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-950/70 dark:text-teal-300">
        ✓
      </span>
    );
  }
  return <span className="text-muted/40 font-bold">—</span>;
}
