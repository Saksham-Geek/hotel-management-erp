'use client';

import { useEffect, useState } from 'react';
import { generateBillEscPos } from '@/lib/escpos';
import { sendEscPosToPrinter, pulseDrawerOrBuzzer } from '@/lib/escpos-printer';
import { formatDeterministicTime, formatDeterministicDate } from '@/lib/dates';

export interface BillPrintData {
  invoiceNumber: string;
  outletName: string;
  address?: string | null;
  contactPhone?: string | null;
  fssaiNumber?: string | null;
  gstin?: string | null;
  tableNumber?: string | null;
  roomNumber?: string | null;
  orderType: string;
  customerName?: string | null;
  customerPhone?: string | null;
  serverName?: string | null;
  createdAt: string;
  items: {
    itemName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  discountAmount?: number;
  serviceChargeAmount?: number;
  cgstAmount: number;
  sgstAmount: number;
  netTotal: number;
  paymentMethod: string;
  upiId?: string | null;
}

export function BillPrintModal({
  data,
  onClose,
}: {
  data: BillPrintData;
  onClose: () => void;
}) {
  const [width, setWidth] = useState<'80mm' | '58mm'>('80mm');
  const [isPrintingDirect, setIsPrintingDirect] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const formattedTime = formatDeterministicTime(data.createdAt, true);
  const formattedDate = formatDeterministicDate(data.createdAt);

  async function handleDirectEscPosPrint() {
    setIsPrintingDirect(true);
    setStatusMsg(null);
    try {
      const bytes = generateBillEscPos(data, width);
      const res = await sendEscPosToPrinter(bytes);
      setStatusMsg(res.message);
      if (res.success && res.method !== 'BrowserDialog') {
        setTimeout(() => onClose(), 1200);
      }
    } catch (err: any) {
      setStatusMsg(err?.message || 'Direct printing failed');
    } finally {
      setIsPrintingDirect(false);
    }
  }

  async function handleOpenDrawer() {
    try {
      const res = await pulseDrawerOrBuzzer();
      setStatusMsg(res.message);
    } catch (err: any) {
      setStatusMsg('Cash drawer trigger failed');
    }
  }

  function handleStandardPrint() {
    window.print();
  }

  const upiPayUrl = data.upiId
    ? `upi://pay?pa=${data.upiId}&pn=${encodeURIComponent(data.outletName)}&am=${data.netTotal.toFixed(2)}&cu=INR&tr=${data.invoiceNumber}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bill-print-dialog-title"
        className="relative flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl overflow-hidden text-slate-900"
      >
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs" aria-hidden="true">
              BILL
            </span>
            <div>
              <p id="bill-print-dialog-title" className="text-xs font-bold text-slate-900">
                Customer Tax Bill ({width} ESC/POS)
              </p>
              <p className="text-[10px] text-slate-500 font-mono">{data.invoiceNumber}</p>
            </div>
          </div>

          {/* Width Selector */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setWidth('80mm')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                width === '80mm' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              80mm Roll
            </button>
            <button
              type="button"
              onClick={() => setWidth('58mm')}
              className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                width === '58mm' ? 'bg-slate-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              58mm Mini
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Action Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-emerald-50/50 px-5 py-2.5 print:hidden">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isPrintingDirect}
              onClick={handleDirectEscPosPrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <span>⚡</span>
              <span>{isPrintingDirect ? 'Streaming Bytes...' : 'Direct ESC/POS Print (Thermal)'}</span>
            </button>
            <button
              type="button"
              onClick={handleOpenDrawer}
              title="Pulse Pin 2 to open cash drawer"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
            >
              💵 Drawer Kick
            </button>
          </div>

          <button
            type="button"
            onClick={handleStandardPrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
          >
            🖨️ Browser Dialog
          </button>
        </div>

        {statusMsg && (
          <div className="border-b border-emerald-100 bg-emerald-50 px-5 py-1.5 text-center text-xs font-semibold text-emerald-900 print:hidden">
            {statusMsg}
          </div>
        )}

        {/* Thermal Receipt Layout */}
        <div className="max-h-[70vh] overflow-y-auto p-6 bg-slate-100 print:max-h-none print:p-0 print:bg-white flex justify-center">
          <div
            className={`border border-dashed border-slate-300 bg-white p-5 font-mono text-[11px] leading-tight shadow-md print:w-full print:border-none print:p-0 print:shadow-none ${
              width === '58mm' ? 'w-[230px]' : 'w-[290px]'
            }`}
          >
            {/* Header */}
            <div className="text-center border-b border-black pb-2">
              <p className="text-[15px] font-black uppercase tracking-wider">{data.outletName}</p>
              {data.address && <p className="text-[10px] text-slate-600 mt-0.5">{data.address}</p>}
              {data.contactPhone && <p className="text-[10px] text-slate-600">Tel: {data.contactPhone}</p>}
              {data.gstin && <p className="text-[10px] font-bold mt-1">GSTIN: {data.gstin}</p>}
              {data.fssaiNumber && <p className="text-[9px] text-slate-600">FSSAI Lic: {data.fssaiNumber}</p>}
              <p className="text-[11px] font-extrabold uppercase mt-1 bg-black text-white py-0.5 tracking-wider">
                TAX INVOICE
              </p>
            </div>

            {/* Bill Meta */}
            <div className="my-2 border-b border-dashed border-black pb-2 text-[10px] space-y-0.5">
              <div className="flex justify-between font-bold">
                <span>INVOICE: #{data.invoiceNumber}</span>
                <span>{formattedDate} {formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span>TYPE: {data.orderType.toUpperCase()}</span>
                {data.tableNumber && <span className="font-bold">TABLE: {data.tableNumber}</span>}
                {data.roomNumber && <span className="font-bold">ROOM: {data.roomNumber}</span>}
              </div>
              {data.customerName && (
                <div className="flex justify-between">
                  <span>GUEST: {data.customerName}</span>
                  {data.customerPhone && <span>{data.customerPhone}</span>}
                </div>
              )}
              {data.serverName && (
                <div className="flex justify-between text-slate-600">
                  <span>STEWARD:</span>
                  <span>{data.serverName}</span>
                </div>
              )}
            </div>

            {/* Itemized Table */}
            <div className="my-2 border-b border-black pb-2">
              <div className="flex justify-between font-extrabold border-b border-black pb-1 mb-1 text-[10px]">
                <span className="flex-1 text-left">ITEM</span>
                <span className="w-8 text-center">QTY</span>
                <span className="w-12 text-right">RATE</span>
                <span className="w-14 text-right">AMT</span>
              </div>
              <div className="space-y-1">
                {data.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-baseline text-[11px]">
                    <span className="flex-1 text-left font-bold truncate pr-1">{it.itemName}</span>
                    <span className="w-8 text-center">{it.quantity}</span>
                    <span className="w-12 text-right text-slate-600">{it.unitPrice.toFixed(0)}</span>
                    <span className="w-14 text-right font-black">{it.totalPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tax & Totals */}
            <div className="my-2 border-b-2 border-black pb-2 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold">₹{data.subtotal.toFixed(2)}</span>
              </div>
              {data.discountAmount != null && data.discountAmount > 0 && (
                <div className="flex justify-between text-rose-700 font-semibold">
                  <span>Discount:</span>
                  <span>-₹{data.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {data.serviceChargeAmount != null && data.serviceChargeAmount > 0 && (
                <div className="flex justify-between">
                  <span>Service Charge:</span>
                  <span>₹{data.serviceChargeAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>CGST (2.5%):</span>
                <span>₹{data.cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>SGST (2.5%):</span>
                <span>₹{data.sgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[14px] font-black border-t-2 border-black pt-1.5 mt-1.5">
                <span>NET TOTAL:</span>
                <span>₹{data.netTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-600">
                <span>PAYMENT MODE:</span>
                <span className="font-bold uppercase">{data.paymentMethod}</span>
              </div>
            </div>

            {/* UPI QR Pay Info */}
            {data.upiId && upiPayUrl && (
              <div className="my-2 border-b border-dashed border-black pb-2 text-center">
                <p className="text-[10px] font-bold">UPI ID: {data.upiId}</p>
                <p className="text-[9px] text-slate-500">Scan via GPay / PhonePe / Paytm / BHIM</p>
              </div>
            )}

            {/* Footer */}
            <div className="text-center text-[10px] text-slate-600 space-y-0.5 mt-2">
              <p className="font-bold">Thank you for dining with us!</p>
              <p>Please visit again.</p>
              <p className="text-[8px] text-slate-500 font-semibold mt-1">SAC: 996331 · GST on Restaurant Service @ 5.00% without ITC</p>
              <p className="text-[8px] text-slate-400">FSSAI Lic: {data.fssaiNumber || '10022021000123'}</p>
            </div>
          </div>
        </div>

        {/* Modal Footer (Hidden in Print) */}
        <div className="border-t border-slate-200 bg-slate-50 px-5 py-3 text-right print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
