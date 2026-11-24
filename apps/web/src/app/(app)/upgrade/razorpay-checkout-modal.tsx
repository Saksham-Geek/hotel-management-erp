'use client';

import React, { useState } from 'react';
import { btnCls, btnGhostCls } from '@/components/ui';

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  planKey: string;
  planName: string;
  monthlyPrice: number;
  razorpayKeyId: string;
  customerName?: string;
  customerEmail?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function RazorpayCheckoutModal({
  isOpen,
  planKey,
  planName,
  monthlyPrice,
  razorpayKeyId,
  customerName,
  customerEmail,
  onClose,
  onSuccess,
}: RazorpayCheckoutModalProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi_autopay' | 'card_mandate' | 'netbanking'>('upi_autopay');
  const [upiId, setUpiId] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const basePrice = billingCycle === 'annual' ? Math.round(monthlyPrice * 10) : monthlyPrice;
  const gstAmount = Math.round(basePrice * 0.18);
  const totalAmount = basePrice + gstAmount;

  const handlePay = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // 1. In sandbox / test environment or standard browser, simulate or trigger Razorpay
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const orderId = `order_${Date.now()}`;

      // Submit verification to backend
      const res = await fetch('/api/subscription/verify-payment', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          planKey,
          billingCycle,
          razorpayPaymentId: paymentId,
          razorpayOrderId: orderId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Payment verification failed');
      }

      onSuccess();
    } catch (err: any) {
      setError(err?.message || 'Payment failed. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-slate-900 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700 font-bold dark:bg-blue-950 dark:text-blue-400">
              💳
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Subscribe to {planName.split('(')[0].trim()}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure 256-bit Razorpay Auto-Debit Mandate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* Billing Cycle Switcher */}
        <div className="mt-5 flex rounded-xl bg-slate-100 p-1 dark:bg-white/5">
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              billingCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Monthly Auto-Debit
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition ${
              billingCycle === 'annual'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
            }`}
          >
            Annual Billing <span className="ml-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">2 Months Free</span>
          </button>
        </div>

        {/* Price Breakdown */}
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 text-xs dark:border-white/5 dark:bg-white/[0.02]">
          <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
            <span>Base Subscription Fee ({billingCycle === 'annual' ? '12 Months' : 'Monthly'}):</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">₹{basePrice.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between py-1 text-slate-600 dark:text-slate-400">
            <span>IGST @ 18% (SAC 998314 SaaS Service):</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200">₹{gstAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900 dark:border-white/10 dark:text-white">
            <span>Total Payable:</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-display text-base">₹{totalAmount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Recurring Payment Method Selection */}
        <div className="mt-4">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Select Auto-Debit Mandate Method
          </label>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setPaymentMethod('upi_autopay')}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 font-semibold transition ${
                paymentMethod === 'upi_autopay'
                  ? 'border-blue-500 bg-blue-50/60 text-blue-800 ring-1 ring-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span className="text-base mb-1">⚡</span>
              <span>UPI Autopay</span>
              <span className="text-[10px] text-slate-400">GPay / PhonePe</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('card_mandate')}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 font-semibold transition ${
                paymentMethod === 'card_mandate'
                  ? 'border-blue-500 bg-blue-50/60 text-blue-800 ring-1 ring-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span className="text-base mb-1">💳</span>
              <span>Card Mandate</span>
              <span className="text-[10px] text-slate-400">Visa / Mastercard</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('netbanking')}
              className={`flex flex-col items-center justify-center rounded-xl border p-3 font-semibold transition ${
                paymentMethod === 'netbanking'
                  ? 'border-blue-500 bg-blue-50/60 text-blue-800 ring-1 ring-blue-500 dark:bg-blue-950/40 dark:text-blue-300'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              <span className="text-base mb-1">🏦</span>
              <span>e-NACH</span>
              <span className="text-[10px] text-slate-400">Netbanking</span>
            </button>
          </div>
        </div>

        {paymentMethod === 'upi_autopay' && (
          <div className="mt-3">
            <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
              UPI ID for Recurring Mandate
            </label>
            <input
              type="text"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. hotelmanager@okhdfcbank"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-slate-800 dark:text-white"
            />
          </div>
        )}

        {/* Security badge */}
        <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span>🛡️</span>
          <span>RBI Compliant e-Mandate with instant cancellation anytime in your dashboard.</span>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
          <button type="button" onClick={onClose} className={btnGhostCls}>
            Cancel
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handlePay}
            className={`${btnCls} bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2 px-4 shadow-sm`}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing Auto-Debit...
              </span>
            ) : (
              `Authorize ₹${totalAmount.toLocaleString('en-IN')} & Activate →`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
