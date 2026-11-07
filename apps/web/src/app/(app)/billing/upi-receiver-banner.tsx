'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UpiSettingsModal } from './upi-settings-modal';

interface UpiReceiverBannerProps {
  upiSettings: {
    upiId: string;
    upiMerchantName: string;
    propertyName: string;
    isOwner: boolean;
  } | null;
  isOwner: boolean;
  propertyName: string;
  reservationId?: string;
}

export function UpiReceiverBanner({
  upiSettings,
  isOwner,
  propertyName,
  reservationId,
}: UpiReceiverBannerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const activeVpa = upiSettings?.upiId || 'Not configured';
  const activeMerchant = upiSettings?.upiMerchantName || propertyName;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200/80 bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 p-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white font-extrabold text-sm shadow-xs">
            ₹
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900 font-display">
                Front Desk Receiver UPI VPA:
              </span>
              <span className="font-mono text-xs font-black text-indigo-950 bg-white border border-indigo-200 px-2.5 py-0.5 rounded-lg shadow-2xs">
                {activeVpa}
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                ({activeMerchant})
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-[9px] font-bold text-emerald-900">
                <span>✓</span> NPCI Verified Account
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Guest QR scan-to-pay payments and direct web booking deposits are routed directly to this receiver bank VPA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwner ? (
            <>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>⚙️ Quick Edit UPI ID</span>
                <span className="rounded-full bg-amber-400 text-slate-950 text-[9px] font-extrabold px-1.5 py-0.2">
                  Owner
                </span>
              </button>
              <Link
                href="/settings?tab=payments"
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-bold text-indigo-950 shadow-2xs hover:bg-indigo-50 transition-colors"
              >
                <span>⚙️ Manage in Settings &rarr;</span>
              </Link>
            </>
          ) : (
            <div
              title="Protected Security Policy: Only the Property Owner can modify receiving bank details"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 shadow-2xs select-none"
            >
              <span>🔒</span>
              <span>Owner Authority Only</span>
            </div>
          )}
        </div>
      </div>

      <UpiSettingsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        currentUpiId={activeVpa}
        currentMerchantName={activeMerchant}
        propertyName={propertyName}
        reservationId={reservationId}
        isOwner={isOwner}
      />
    </>
  );
}
