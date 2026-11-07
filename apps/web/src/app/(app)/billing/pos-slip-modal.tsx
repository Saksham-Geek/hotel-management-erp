'use client';

import { useEffect } from 'react';

interface PosSlipModalProps {
  slip: {
    merchantName: string;
    merchantId?: string;
    terminalId: string;
    batchNumber?: string;
    invoiceNumber?: string;
    dateTime?: string;
    cardBrand: string;
    maskedPan: string;
    cardholderName?: string;
    authCode: string;
    rrn: string;
    amount: number;
    currency: string;
    aid?: string;
    tvr?: string;
    tsi?: string;
    entryMode?: string;
    verificationMethod?: string;
    hostResponse?: string;
  };
  onClose: () => void;
}

export function PosSlipModal({ slip, onClose }: PosSlipModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formattedDate = slip.dateTime
    ? new Date(slip.dateTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
      })
    : new Date().toLocaleString('en-IN');

  const printSlip = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in-50" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-slip-dialog-title"
        className="relative w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Top Header Controls */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="text-base" aria-hidden="true">🧾</span>
            <span id="pos-slip-dialog-title" className="text-xs font-black uppercase tracking-wider text-slate-800">
              POS EDC Transaction Slip
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Thermal Receipt Body */}
        <div className="p-6 bg-amber-50/20 font-mono text-xs text-slate-900 space-y-3.5 select-text">
          {/* Header */}
          <div className="text-center space-y-0.5 border-b border-dashed border-slate-300 pb-3">
            <p className="font-bold text-sm tracking-tight font-display uppercase">{slip.merchantName}</p>
            <p className="text-[11px] text-slate-600">ELECTRONIC DATA CAPTURE (EDC)</p>
            <p className="text-[10px] text-slate-500">HOTEL OPERATIONS CASHIERING</p>
          </div>

          {/* Terminal & Batch Details */}
          <div className="grid grid-cols-2 gap-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div>
              <span className="text-slate-500">TID: </span>
              <span className="font-bold">{slip.terminalId}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">MID: </span>
              <span className="font-bold">{slip.merchantId || 'MID-IN-HDFC-991203'}</span>
            </div>
            <div>
              <span className="text-slate-500">BATCH: </span>
              <span>{slip.batchNumber || '000142'}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">INVOICE: </span>
              <span>{slip.invoiceNumber || 'TXN-9912'}</span>
            </div>
            <div className="col-span-2 text-[10px] text-slate-500 pt-0.5">
              <span>DATE/TIME: </span>
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Card & Guest Details */}
          <div className="space-y-1 text-[11px] border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between">
              <span className="text-slate-500">CARD TYPE:</span>
              <span className="font-bold uppercase text-indigo-950">{slip.cardBrand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">CARD NUMBER:</span>
              <span className="font-black tracking-wider">{slip.maskedPan}</span>
            </div>
            {slip.cardholderName && (
              <div className="flex justify-between">
                <span className="text-slate-500">CARDHOLDER:</span>
                <span className="font-bold uppercase truncate max-w-[160px]">{slip.cardholderName}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">ENTRY MODE:</span>
              <span>{slip.entryMode || 'EMV CHIP / CONTACTLESS'}</span>
            </div>
            {slip.aid && (
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500">AID / TVR:</span>
                <span>{slip.aid} / {slip.tvr || '0000008000'}</span>
              </div>
            )}
          </div>

          {/* Amount & Bank Authorization */}
          <div className="space-y-1 border-b border-dashed border-slate-300 pb-3">
            <div className="flex justify-between text-base font-black">
              <span>TOTAL (INR):</span>
              <span className="text-emerald-950">₹{Number(slip.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-[11px] pt-1">
              <span className="text-slate-500">BANK AUTH CODE:</span>
              <span className="font-bold text-emerald-800">{slip.authCode}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-500">BANK RRN:</span>
              <span className="font-bold">{slip.rrn}</span>
            </div>
            <div className="flex justify-between text-[10px] text-slate-600">
              <span>RESPONSE:</span>
              <span className="text-emerald-700 font-bold">{slip.hostResponse || '00 - APPROVED'}</span>
            </div>
          </div>

          {/* Verification & Legal */}
          <div className="text-center text-[10px] space-y-1 text-slate-500 pt-1">
            <p className="font-bold text-slate-800">
              *** {slip.verificationMethod === 'PIN_VERIFIED' ? 'PIN VERIFIED OK' : 'APPROVED'} ***
            </p>
            <p className="text-[9px]">NO SIGNATURE REQUIRED FOR EMV CHIP &amp; CONTACTLESS PIN TRANS</p>
            <p className="text-[9px] uppercase tracking-wider font-semibold text-slate-600">
              CUSTOMER &amp; MERCHANT RECORD COPY
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-4 gap-2">
          <button
            type="button"
            onClick={printSlip}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 text-white px-3 py-2 text-xs font-bold shadow-xs hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span>🖨️ Print Charge Slip</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
