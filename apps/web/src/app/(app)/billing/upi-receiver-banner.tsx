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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-xs">
            ₹
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm font-bold text-foreground font-display">
                Front Desk Receiver UPI VPA:
              </span>
              <span className="font-mono text-xs sm:text-sm font-black text-foreground bg-muted/60 border border-border px-3 py-0.5 rounded-lg shadow-2xs">
                {activeVpa}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
                ({activeMerchant})
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <span>✓</span> NPCI Verified Account
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
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
                className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-sm hover:opacity-90 transition-opacity cursor-pointer"
              >
                <span>⚙️ Quick Edit UPI ID</span>
                <span className="rounded-full bg-black/20 text-white text-[9px] font-extrabold px-1.5 py-0.2">
                  Owner
                </span>
              </button>
              <Link
                href="/settings?tab=payments"
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs sm:text-sm font-bold text-foreground shadow-2xs hover:bg-muted/40 transition-colors"
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
