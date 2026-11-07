'use client';

import { useEffect } from 'react';

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

  function handlePrint() {
    window.print();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="kot-print-dialog-title"
        className="relative flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl overflow-hidden text-slate-900"
      >
        
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs" aria-hidden="true">
              KOT
            </span>
            <div>
              <p id="kot-print-dialog-title" className="text-xs font-bold text-slate-900">Kitchen Order Ticket (80mm ESC/POS)</p>
              <p className="text-[10px] text-slate-500 font-mono">{data.kotNumber}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition-colors cursor-pointer"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <path d="M6 14h12v8H6z" />
              </svg>
              Print KOT Slip
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Authentic 80mm ESC/POS Kitchen Thermal Slip */}
        <div className="max-h-[80vh] overflow-y-auto p-6 bg-slate-100 print:max-h-none print:p-0 print:bg-white">
          <div className="mx-auto w-[290px] border border-dashed border-slate-300 bg-white p-5 font-mono text-[12px] leading-tight shadow-md print:w-full print:border-none print:p-0 print:shadow-none">
            
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
                <div className="flex justify-between items-center text-[11px] font-medium mt-1 text-slate-600">
                  <span>GUEST:</span>
                  <span>{data.guestName}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-[11px] font-medium mt-1 text-slate-600">
                <span>SERVER:</span>
                <span>{data.serverName || 'Staff Attendant'}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1">
                <span>TIME:</span>
                <span>{formattedDate} {formattedTime}</span>
              </div>
            </div>

            {/* Itemized Order List */}
            <div className="border-b-2 border-black pb-2.5">
              <div className="flex justify-between font-black border-b border-black pb-1 mb-1.5 text-[11px]">
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
              <p className="text-[9px] text-slate-500 mt-0.5">Dispatched via Aura Dine KOT System</p>
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
