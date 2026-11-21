'use client';

import { useEffect, useState } from 'react';
import { generateKotEscPos } from '@/lib/escpos';
import { sendEscPosToPrinter, pulseDrawerOrBuzzer } from '@/lib/escpos-printer';

export interface KotPrintData {
  kotNumber: string;
  roundNumber?: number;
  orderType: 'dine_in' | 'room_service' | 'takeaway' | 'delivery' | 'aggregator';
  outletName: string;
  tableNumber?: string | null;
  roomNumber?: string | null;
  guestName?: string | null;
  serverName?: string | null;
  specialInstructions?: string | null;
  createdAt: string;
  items: {
    itemName: string;
    quantity: number;
    foodType?: string;
    specialNotes?: string | null;
  }[];
}

export function KotPrintModal({
  data,
  onClose,
}: {
  data: KotPrintData;
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

  const formattedTime = new Date(data.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = new Date(data.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  async function handleDirectEscPosPrint() {
    setIsPrintingDirect(true);
    setStatusMsg(null);
    try {
      const bytes = generateKotEscPos(data, width);
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

  async function handleTestBuzzer() {
    try {
      const res = await pulseDrawerOrBuzzer();
      setStatusMsg(res.message);
    } catch (err: any) {
      setStatusMsg('Buzzer signal failed');
    }
  }

  function handleStandardPrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kot-print-dialog-title"
        className="relative flex w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl overflow-hidden text-slate-900"
      >
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 gap-2 print:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs" aria-hidden="true">
              KOT
            </span>
            <div>
              <p id="kot-print-dialog-title" className="text-xs font-bold text-slate-900">
                Kitchen Order Ticket ({width} Thermal)
              </p>
              <p className="text-[10px] text-slate-500 font-mono">{data.kotNumber}</p>
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
              <span>{isPrintingDirect ? 'Streaming Bytes...' : 'Direct ESC/POS Print (USB/Serial)'}</span>
            </button>
            <button
              type="button"
              onClick={handleTestBuzzer}
              title="Test Kitchen Buzzer / Cash Drawer Kick"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 shadow-2xs cursor-pointer"
            >
              🔔 Buzzer
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

        {/* Authentic 80mm / 58mm ESC/POS Kitchen Thermal Slip */}
        <div className="max-h-[70vh] overflow-y-auto p-6 bg-slate-100 print:max-h-none print:p-0 print:bg-white flex justify-center">
          <div
            className={`border border-dashed border-slate-300 bg-white p-5 font-mono text-[12px] leading-tight shadow-md print:w-full print:border-none print:p-0 print:shadow-none ${
              width === '58mm' ? 'w-[230px]' : 'w-[290px]'
            }`}
          >
            {/* KOT Header */}
            <div className="text-center border-b-2 border-black pb-2.5">
              <p className="text-[15px] font-black uppercase tracking-wider">{data.outletName}</p>
              <p className="text-[14px] font-extrabold tracking-widest mt-1 bg-black text-white px-2 py-0.5 inline-block">
                *** KITCHEN ORDER TICKET ***
              </p>
              <p className="text-[18px] font-black tracking-tight mt-1.5">{data.kotNumber}</p>
            </div>

            {/* Destination Pill */}
            <div className="my-2.5 border-b border-dashed border-black pb-2.5">
              <div className="flex justify-between items-center text-[13px] font-bold">
                <span>ORDER TYPE:</span>
                <span className="uppercase">{data.orderType.replace('_', ' ')}</span>
              </div>
              {data.tableNumber && (
                <div className="flex justify-between items-center text-[15px] font-black mt-1 text-emerald-950">
                  <span>TABLE NO:</span>
                  <span className="border-2 border-black px-2 py-0.5">{data.tableNumber}</span>
                </div>
              )}
              {data.roomNumber && (
                <div className="flex justify-between items-center text-[15px] font-black mt-1 text-indigo-950">
                  <span>ROOM NO:</span>
                  <span className="border-2 border-black px-2 py-0.5">ROOM {data.roomNumber}</span>
                </div>
              )}
              {data.guestName && (
                <div className="flex justify-between items-center text-[11px] mt-1 text-slate-700">
                  <span>GUEST:</span>
                  <span className="font-bold">{data.guestName}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-[11px] text-slate-600 mt-1">
                <span>DATE/TIME:</span>
                <span>{formattedDate} {formattedTime}</span>
              </div>
              {data.serverName && (
                <div className="flex justify-between items-center text-[11px] text-slate-600 mt-0.5">
                  <span>CAPTAIN:</span>
                  <span className="font-semibold">{data.serverName}</span>
                </div>
              )}
            </div>

            {/* KOT Items List */}
            <div className="my-2.5 border-b-2 border-black pb-2.5">
              <div className="flex justify-between text-[11px] font-extrabold border-b border-black pb-1 mb-2">
                <span className="w-12">QTY</span>
                <span className="flex-1 text-left">ITEM NAME</span>
              </div>
              <div className="space-y-2">
                {data.items.map((it, idx) => (
                  <div key={idx} className="flex flex-col">
                    <div className="flex items-baseline justify-between font-black text-[13px]">
                      <span className="w-12 text-base font-extrabold">{it.quantity} x</span>
                      <span className="flex-1 text-left uppercase">
                        {it.foodType === 'veg' ? '🟢 ' : it.foodType === 'non_veg' ? '🔴 ' : '🟡 '}
                        {it.itemName}
                      </span>
                    </div>
                    {it.specialNotes && (
                      <p className="ml-12 text-[10px] font-bold text-red-600 italic">
                        ↳ Note: {it.specialNotes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Special Cooking Instructions */}
            {data.specialInstructions && (
              <div className="mt-2.5 border-b border-dashed border-black pb-2.5 text-[11px]">
                <p className="font-black text-red-700">SPECIAL INSTRUCTIONS:</p>
                <p className="italic mt-0.5">{data.specialInstructions}</p>
              </div>
            )}

            {/* KOT Footer */}
            <div className="mt-3 text-center text-[10px] font-bold">
              <p>*** END OF ORDER ***</p>
              <p className="text-[9px] text-slate-500 mt-0.5">Dispatched via Antigravity ESC/POS Engine</p>
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
