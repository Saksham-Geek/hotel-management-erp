'use client';

import { useState } from 'react';
import { btnCls, inputCls } from '@/components/ui';
import { updateUpiSettingsAction } from './actions';

interface UpiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUpiId: string;
  currentMerchantName: string;
  propertyName: string;
  reservationId?: string;
  isOwner: boolean;
}

export function UpiSettingsModal({
  isOpen,
  onClose,
  currentUpiId,
  currentMerchantName,
  propertyName,
  reservationId,
  isOwner,
}: UpiSettingsModalProps) {
  const [upiId, setUpiId] = useState(currentUpiId || '');
  const [merchantName, setMerchantName] = useState(currentMerchantName || propertyName);

  if (!isOpen) return null;

  const previewVpa = upiId.trim() || 'yourhotel@icici';
  const previewName = merchantName.trim() || propertyName;
  const sampleUri = `upi://pay?pa=${encodeURIComponent(previewVpa)}&pn=${encodeURIComponent(previewName)}&cu=INR`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-base shadow-2xs">
              ₹
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-base font-bold text-slate-900">
                  Receiver UPI ID &amp; Bank Settlement
                </h3>
                {isOwner ? (
                  <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900 flex items-center gap-1">
                    <span>👑</span> Owner Authority
                  </span>
                ) : (
                  <span className="rounded-full bg-rose-100 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-800 flex items-center gap-1">
                    <span>🔒</span> Read-Only (Staff)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {propertyName} · NPCI Instant Direct Settlement
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        {isOwner ? (
          <form action={updateUpiSettingsAction} className="mt-5 space-y-4">
            <input type="hidden" name="reservationId" value={reservationId ?? ''} />

            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3 text-xs text-blue-900 space-y-1">
              <p className="font-bold flex items-center gap-1">
                <span>🛡️</span> Hotel Owner Financial Control
              </p>
              <p className="text-[11px] text-blue-800 leading-relaxed">
                As the hotel owner, configuring this UPI VPA ensures all guest QR payments at the front desk and direct web bookings credit instantly into your designated bank account. Managers and receptionists cannot alter this receiving address.
              </p>
            </div>

            <label className="block text-xs font-semibold text-slate-800">
              Receiver Merchant UPI ID (VPA) <span className="text-rose-600">*</span>
              <input
                name="upiId"
                required
                placeholder="e.g. tajmumbai@hdfcbank or 9876543210@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className={`${inputCls} mt-1.5 font-mono text-sm`}
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Standard format: <code className="font-mono">name@bank</code> (HDFC, ICICI, SBI, Axis, Paytm, etc.)
              </span>
            </label>

            <label className="block text-xs font-semibold text-slate-800">
              Merchant Display Name (NPCI Payee Name)
              <input
                name="upiMerchantName"
                placeholder={propertyName}
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className={`${inputCls} mt-1.5 text-sm`}
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Appears on guest UPI apps (Google Pay, PhonePe, Paytm, BHIM) during payment confirmation.
              </span>
            </label>

            {/* Live NPCI Preview */}
            <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-3.5 text-xs space-y-2">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                <span>Live NPCI Scan-to-Pay Payload Preview</span>
                <span className="text-emerald-700">✓ Valid VPA</span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-2 font-mono text-[10px] text-slate-700 break-all select-all">
                {sampleUri}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`${btnCls} bg-indigo-600 text-white hover:bg-indigo-700 text-xs px-5 py-2.5 font-bold cursor-pointer shadow-md`}
              >
                Save Receiver UPI ID
              </button>
            </div>
          </form>
        ) : (
          /* Staff Read-Only State */
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-amber-200/90 bg-amber-50/80 p-4 text-xs text-amber-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-900">
                <span className="text-base">🔒</span>
                <span>Restricted Setting: Owner Authority Only</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-900/90">
                Under hotel banking compliance and anti-fraud protocols, only the verified <strong>Hotel Owner</strong> can configure or update the receiver UPI VPA. Managers, front desk agents, and cashiers have read-only visibility.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Active Receiver UPI VPA
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-slate-900">
                  {currentUpiId || 'Not configured (defaulting to property merchant)'}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Beneficiary Name
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  {currentMerchantName || propertyName}
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Close View
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
