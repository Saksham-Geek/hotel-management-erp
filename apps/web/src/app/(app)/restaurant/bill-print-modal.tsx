'use client';

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
  const formattedTime = new Date(data.createdAt).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const formattedDate = new Date(data.createdAt).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  function handlePrint() {
    window.print();
  }

  const upiPayUrl = data.upiId
    ? `upi://pay?pa=${data.upiId}&pn=${encodeURIComponent(data.outletName)}&am=${data.netTotal.toFixed(2)}&cu=INR&tr=${data.invoiceNumber}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in-50">
      <div className="relative flex w-full max-w-md flex-col rounded-2xl bg-white shadow-2xl overflow-hidden text-slate-900">
        
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
              BILL
            </span>
            <div>
              <p className="text-xs font-bold text-slate-900">Customer Tax Bill (Aura Dine 80mm ESC/POS)</p>
              <p className="text-[10px] text-slate-500 font-mono">{data.invoiceNumber}</p>
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
              Print Bill
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 80mm Thermal Receipt Layout */}
        <div className="max-h-[80vh] overflow-y-auto p-6 bg-slate-100 print:max-h-none print:p-0 print:bg-white">
          <div className="mx-auto w-[290px] border border-dashed border-slate-300 bg-white p-5 font-mono text-[11px] leading-tight shadow-md print:w-full print:border-none print:p-0 print:shadow-none">
            
            {/* Header */}
            <div className="text-center border-b border-black pb-2">
              <p className="text-[15px] font-black uppercase tracking-wider">{data.outletName}</p>
              {data.address && <p className="text-[10px] text-slate-600 mt-0.5">{data.address}</p>}
              {data.contactPhone && <p className="text-[10px] text-slate-600">Ph: {data.contactPhone}</p>}
              <div className="mt-1 flex justify-center gap-2 text-[9px] text-slate-700">
                {data.gstin && <span>GSTIN: {data.gstin}</span>}
                {data.fssaiNumber && <span>FSSAI: {data.fssaiNumber}</span>}
              </div>
              <p className="text-[11px] font-black uppercase mt-1.5 bg-black text-white px-2 py-0.5 inline-block">
                TAX INVOICE / RESTAURANT BILL
              </p>
            </div>

            {/* Bill Details */}
            <div className="my-2 border-b border-dashed border-black pb-2 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span>Bill No: <strong className="font-mono text-black">{data.invoiceNumber}</strong></span>
                <span>{formattedDate} {formattedTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Type: <strong className="uppercase">{data.orderType.replace('_', ' ')}</strong></span>
                <span>Captain: {data.serverName || 'Captain'}</span>
              </div>
              {data.tableNumber && (
                <div className="text-[12px] font-bold">TABLE: {data.tableNumber}</div>
              )}
              {data.roomNumber && (
                <div className="text-[12px] font-bold">IN-ROOM DINING: ROOM {data.roomNumber}</div>
              )}
              {data.customerName && (
                <div>Guest: <strong>{data.customerName}</strong> {data.customerPhone && `(${data.customerPhone})`}</div>
              )}
            </div>

            {/* Items Header */}
            <div className="border-b border-black pb-1 font-bold text-[10px] flex justify-between">
              <span className="w-1/2">ITEM [SAC 996331]</span>
              <span className="w-12 text-center">QTY</span>
              <span className="w-12 text-right">RATE</span>
              <span className="w-14 text-right">AMT</span>
            </div>

            {/* Line Items */}
            <div className="border-b border-dashed border-black py-1.5 space-y-1">
              {data.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[10.5px]">
                  <span className="w-1/2 truncate font-medium">{item.itemName}</span>
                  <span className="w-12 text-center">{item.quantity}</span>
                  <span className="w-12 text-right">₹{item.unitPrice}</span>
                  <span className="w-14 text-right font-bold">₹{item.totalPrice}</span>
                </div>
              ))}
            </div>

            {/* Totals & Tax Breakdown */}
            <div className="py-2 border-b border-black space-y-1 text-[10.5px]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>₹{data.subtotal.toFixed(2)}</span>
              </div>
              {!!data.discountAmount && data.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-800 font-bold">
                  <span>Discount:</span>
                  <span>-₹{data.discountAmount.toFixed(2)}</span>
                </div>
              )}
              {!!data.serviceChargeAmount && data.serviceChargeAmount > 0 && (
                <div className="flex justify-between">
                  <span>Service Charge:</span>
                  <span>+₹{data.serviceChargeAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>CGST (2.5% SAC 996331):</span>
                <span>₹{data.cgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-700">
                <span>SGST (2.5% SAC 996331):</span>
                <span>₹{data.sgstAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-[14px] font-black border-t-2 border-black pt-1.5 mt-1">
                <span>NET TOTAL:</span>
                <span>₹{data.netTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Tender Mode */}
            <div className="py-2 border-b border-dashed border-black text-center text-[11px] font-bold">
              PAYMENT: <span className="uppercase text-emerald-800">{data.paymentMethod.replace('_', ' ')}</span>
            </div>

            {/* Footer */}
            <div className="pt-2 text-center space-y-1 text-[9.5px] text-slate-600">
              <p className="font-bold">*** THANK YOU! VISIT AGAIN ***</p>
              <p>Powered by Aura Dine &amp; Aura PMS</p>
              <p>Food &amp; Beverage GST @ 5% (SAC 996331)</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
