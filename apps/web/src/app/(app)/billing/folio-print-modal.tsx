'use client';

import React, { useState, useEffect } from 'react';
import type { FolioData } from './folio-view';
import { formatStayDates, formatDateTime } from '@/lib/format';
import { sendEscPosToPrinter } from '@/lib/escpos-printer';

interface FolioPrintModalProps {
  folioData: FolioData;
  currency: string;
  onClose: () => void;
  selectedInvoice?: FolioData['folio']['invoices'][number] | null;
}

export function FolioPrintModal({
  folioData,
  currency,
  onClose,
  selectedInvoice,
}: FolioPrintModalProps) {
  const [printFormat, setPrintFormat] = useState<'80mm' | '58mm' | 'a4'>('80mm');
  const [isStreamingEscPos, setIsStreamingEscPos] = useState(false);
  const [directPrintMsg, setDirectPrintMsg] = useState<string | null>(null);

  const { property, reservation, folio } = folioData;
  const hotelName = property?.name || 'Grand Azure Hotel';
  const invoiceNumber = selectedInvoice?.invoiceNumber || `REC-${folio.id.slice(0, 8).toUpperCase()}`;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const money = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(val || 0);

  // Standard Browser Print formatted strictly to the selected roll or paper size
  const handleBrowserPrint = () => {
    window.print();
  };

  // Raw ESC/POS byte generator for high-speed direct thermal printing without dialog
  const handleDirectThermalPrint = async () => {
    setIsStreamingEscPos(true);
    setDirectPrintMsg(null);

    try {
      const encoder = new TextEncoder();
      const esc = '\x1b';
      const gs = '\x1d';

      // ESC/POS Commands
      const init = `${esc}@`; // Initialize printer
      const center = `${esc}a\x01`; // Align center
      const left = `${esc}a\x00`; // Align left
      const right = `${esc}a\x02`; // Align right
      const boldOn = `${esc}E\x01`;
      const boldOff = `${esc}E\x00`;
      const doubleHeight = `${esc}!\x10`;
      const normalFont = `${esc}!\x00`;
      const cut = `${gs}V\x41\x00`; // Cut paper

      let receipt = '';
      receipt += init;
      receipt += center + boldOn + doubleHeight + `${hotelName}\n` + normalFont + boldOff;
      receipt += center + `FRONT DESK GUEST TAX INVOICE\n`;
      receipt += center + `GSTIN: 27AAAAA0000A1Z5 | SAC: 996311\n`;
      receipt += left + '------------------------------------------------\n';
      receipt += left + `Invoice #: ${invoiceNumber}\n`;
      receipt += left + `Room: ${reservation.roomNumber} | Guest: ${reservation.guestName}\n`;
      receipt += left + `Stay: ${formatStayDates(reservation.checkIn, reservation.checkOut)}\n`;
      receipt += left + '------------------------------------------------\n';
      receipt += left + 'Description                 Qty     Total (INR)\n';
      receipt += left + '------------------------------------------------\n';

      for (const item of folio.items) {
        const desc = item.description.slice(0, 24).padEnd(26, ' ');
        const qty = String(item.quantity).padEnd(6, ' ');
        const total = item.lineTotal.toFixed(2).padStart(12, ' ');
        receipt += `${desc}${qty}${total}\n`;
      }

      receipt += left + '------------------------------------------------\n';
      receipt += right + `Subtotal (Taxable): ${folio.subtotal.toFixed(2)}\n`;
      receipt += right + `GST Total (CGST+SGST): ${folio.taxTotal.toFixed(2)}\n`;
      receipt += right + boldOn + `GRAND TOTAL: ${folio.total.toFixed(2)}\n` + boldOff;
      receipt += right + `Total Paid: ${folio.paidTotal.toFixed(2)}\n`;
      receipt += right + boldOn + `BALANCE DUE: ${folio.balanceDue.toFixed(2)}\n` + boldOff;
      receipt += left + '------------------------------------------------\n';
      receipt += center + (folio.balanceDue <= 0 ? '*** PAID IN FULL ***\n' : '*** PAYMENT PENDING ***\n');
      receipt += center + 'Thank you for staying with us!\n';
      receipt += center + 'Computer-generated statutory invoice\n';
      receipt += '\n\n\n' + cut;

      const rawBytes = encoder.encode(receipt);
      const res = await sendEscPosToPrinter(rawBytes);
      setDirectPrintMsg(res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thermal printer streaming failed';
      setDirectPrintMsg(msg);
    } finally {
      setIsStreamingEscPos(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative my-auto w-full max-w-2xl rounded-3xl border border-line bg-surface p-4 sm:p-6 shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden when printed) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧾</span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-ink">Print Guest Receipt / Invoice</h3>
              <p className="text-[11px] text-muted">
                Room {reservation.roomNumber} · {reservation.guestName}
              </p>
            </div>
          </div>

          {/* Width Mode Selector */}
          <div className="flex items-center gap-1 rounded-xl bg-ground p-1 border border-line text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPrintFormat('80mm')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                printFormat === '80mm' ? 'bg-surface text-ink shadow-2xs' : 'text-muted hover:text-ink'
              }`}
            >
              80mm Roll
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('58mm')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                printFormat === '58mm' ? 'bg-surface text-ink shadow-2xs' : 'text-muted hover:text-ink'
              }`}
            >
              58mm Roll
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('a4')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                printFormat === 'a4' ? 'bg-surface text-ink shadow-2xs' : 'text-muted hover:text-ink'
              }`}
            >
              A4 Sheet
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-xl hover:bg-ground text-slate-400 hover:text-ink transition cursor-pointer"
            title="Close (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Action Status Banner */}
        {directPrintMsg && (
          <div className="mt-3 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-2.5 text-xs text-cyan-800 dark:text-cyan-200 print:hidden">
            ℹ️ {directPrintMsg}
          </div>
        )}

        {/* Printable Viewport */}
        <div className="flex-1 overflow-y-auto py-4 px-1 flex justify-center bg-slate-900/5 dark:bg-black/20 rounded-2xl my-3">
          {/* Paper Container */}
          <div
            id="printable-receipt"
            className={`bg-white text-slate-900 p-5 shadow-lg font-mono text-xs transition-all ${
              printFormat === '80mm'
                ? 'w-[320px] rounded-lg'
                : printFormat === '58mm'
                ? 'w-[230px] rounded-lg text-[10px]'
                : 'w-full max-w-[540px] rounded-xl text-xs font-sans'
            }`}
          >
            {/* Header */}
            <div className="text-center space-y-1 border-b-2 border-dashed border-slate-300 pb-3">
              <h2 className="text-sm sm:text-base font-black tracking-tight uppercase text-slate-950">
                {hotelName}
              </h2>
              <p className="text-[10px] text-slate-600">Front Desk Accommodation Tax Invoice</p>
              <p className="text-[10px] text-slate-600 font-bold">GSTIN: 27AAAAA0000A1Z5 · SAC: 996311</p>
              {selectedInvoice?.irnHash && (
                <p className="text-[8px] truncate text-slate-500" title={selectedInvoice.irnHash}>
                  IRN: {selectedInvoice.irnHash}
                </p>
              )}
            </div>

            {/* Stay & Guest Meta */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Invoice #:</span>
                <span className="font-bold text-slate-950">{invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Guest:</span>
                <span className="font-bold text-slate-950 truncate max-w-[180px]">{reservation.guestName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Room #:</span>
                <span className="font-bold text-slate-950">{reservation.roomNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stay:</span>
                <span className="text-slate-950">{formatStayDates(reservation.checkIn, reservation.checkOut)}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div className="py-2.5 border-b-2 border-dashed border-slate-300">
              <div className="flex justify-between font-bold text-[10px] text-slate-500 uppercase border-b border-slate-200 pb-1 mb-1.5">
                <span>Description</span>
                <span>Amount</span>
              </div>

              <div className="space-y-1.5">
                {folio.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-start text-[11px]">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-950 truncate">{item.description}</p>
                      <p className="text-[9px] text-slate-500">
                        {item.quantity} × {item.unitPrice.toFixed(2)} · SAC {item.hsnSac || '996311'}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-950 shrink-0 tabular-nums">
                      {money(item.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax & Total Calculations */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal (Taxable):</span>
                <span className="tabular-nums">{money(folio.subtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>GST Total:</span>
                <span className="tabular-nums">{money(folio.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-xs font-black text-slate-950 pt-1 border-t border-slate-200">
                <span>TOTAL BILLED:</span>
                <span className="tabular-nums">{money(folio.total)}</span>
              </div>
            </div>

            {/* Payments & Settlement Breakdown */}
            <div className="py-2.5 border-b border-dashed border-slate-300 space-y-1 text-[11px]">
              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Total Realized / Paid:</span>
                <span className="tabular-nums">{money(folio.paidTotal)}</span>
              </div>

              {folio.payments.length > 0 && (
                <div className="pt-1 space-y-0.5 text-[9px] text-slate-500">
                  {folio.payments.map((p) => (
                    <div key={p.id} className="flex justify-between">
                      <span className="uppercase">
                        • {p.method.replace('_', ' ')} {p.reference ? `(${p.reference})` : ''}
                      </span>
                      <span>{money(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between text-xs font-black pt-1 border-t border-slate-200">
                <span>BALANCE DUE:</span>
                <span
                  className={`tabular-nums ${
                    folio.balanceDue <= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {money(folio.balanceDue)}
                </span>
              </div>
            </div>

            {/* Statutory Footer */}
            <div className="pt-3 text-center space-y-1 text-[9px] text-slate-500">
              <p className="font-bold text-slate-800 uppercase text-[10px]">
                {folio.balanceDue <= 0 ? '✓ SETTLED & PAID IN FULL' : '⚠ BALANCE OUTSTANDING'}
              </p>
              <p>Thank you for choosing {hotelName}!</p>
              <p>Computer-generated invoice · No physical signature required</p>
              <p className="text-[8px] text-slate-400">Printed: {formatDateTime(new Date().toISOString())}</p>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar (Hidden when printed) */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 print:hidden">
          <p className="text-[11px] text-muted">
            Formatted for standard POS printers (TVS, Epson, Xprinter, Posiflex).
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDirectThermalPrint}
              disabled={isStreamingEscPos}
              className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-ground px-3.5 py-2 text-xs font-semibold text-ink hover:bg-surface transition cursor-pointer active:scale-95 disabled:opacity-50"
              title="Stream raw ESC/POS bytes directly via USB/Serial without browser print dialog"
            >
              <span>⚡</span>
              <span>{isStreamingEscPos ? 'Streaming...' : 'Direct Thermal'}</span>
            </button>

            <button
              type="button"
              onClick={handleBrowserPrint}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 px-4 py-2 text-xs font-bold text-slate-950 shadow-md shadow-teal-500/20 transition cursor-pointer active:scale-95"
            >
              <span>🖨️</span>
              <span>Print {printFormat === 'a4' ? 'A4 Invoice' : `${printFormat} Receipt`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scoped Print CSS: Ensures ONLY the receipt element prints cleanly */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt,
          #printable-receipt * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 10px !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>
    </div>
  );
}
