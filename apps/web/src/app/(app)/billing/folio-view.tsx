'use client';

import { useState } from 'react';
import { Banner, btnCls, btnGhostCls, EmptyState, inputCls, StatCard, StatusBadge } from '@/components/ui';
import { FormSubmit } from '@/components/form-submit';
import { formatStayDates, formatDate } from '@/lib/format';
import { addFolioCharge, collectFolioPayment, issueInvoice } from './actions';

export interface FolioData {
  reservation: {
    id: string;
    status: string;
    totalAmount: number;
    checkIn: string;
    checkOut: string;
    roomNumber: string;
    guestName: string;
    guestPhone: string | null;
    guestEmail: string | null;
  };
  folio: {
    id: string;
    status: string;
    currency: string;
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    total: number;
    paidTotal: number;
    balanceDue: number;
    items: {
      id: string;
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      lineTotal: number;
      taxCategoryCode: string;
      hsnSac: string;
      cgstAmount: number;
      sgstAmount: number;
      igstAmount: number;
      isInterstate: boolean;
      createdAt: string;
    }[];
    payments: {
      id: string;
      amount: number;
      method: string;
      reference?: string;
      status: string;
      panNumber?: string;
      notes?: string;
      payerName?: string;
      corporateCompanyName?: string;
      createdAt: string;
    }[];
    invoices: {
      id: string;
      invoiceNumber: string;
      financialYear: string;
      invoiceType: string;
      grandTotal: number;
      irnStatus: string;
      irnHash?: string;
      signedQrCode?: string;
      issuedAt: string;
    }[];
  };
}

export function FolioView({
  folioData,
  currency,
  readOnly,
}: {
  folioData: FolioData;
  currency: string;
  readOnly: boolean;
}) {
  const { reservation, folio } = folioData;
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentAmount, setPaymentAmount] = useState(folio.balanceDue > 0 ? folio.balanceDue : 0);
  const [invoiceType, setInvoiceType] = useState('B2C');

  return (
    <div className="space-y-6">
      {/* Reservation & Guest Summary */}
      <div className="rounded-3xl border border-line bg-surface p-6 sm:p-7 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 bg-slate-100 border border-slate-200/80 px-2.5 py-1 rounded-lg">
                Room {reservation.roomNumber}
              </span>
              <StatusBadge status={reservation.status as any} />
            </div>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-black text-slate-950">{reservation.guestName}</h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {formatStayDates(reservation.checkIn, reservation.checkOut)} {reservation.guestPhone ? `· ${reservation.guestPhone}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs">
              Folio #{folio.id.slice(0, 8).toUpperCase()} · Status: <span className="uppercase text-slate-900 font-bold">{folio.status}</span>
            </span>
          </div>
        </div>

        {/* Financial KPI Summary */}
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Subtotal (Taxable)" value={money(folio.subtotal, currency)} detail="Tariff & Services" />
          <StatCard label="GST Total" value={money(folio.taxTotal, currency)} detail="CGST + SGST / IGST" />
          <StatCard label="Total Billed" value={money(folio.total, currency)} detail="Inclusive of Taxes" />
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Balance Due</p>
            <p className={`mt-2 font-display text-2xl sm:text-3xl font-black ${folio.balanceDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {money(folio.balanceDue, currency)}
            </p>
            <p className="mt-1 text-xs sm:text-sm font-medium text-slate-500">
              {folio.paidTotal > 0 ? `Paid: ${money(folio.paidTotal, currency)}` : 'No payments yet'}
            </p>
          </div>
        </div>
      </div>

      {/* Folio Items Table */}
      <section aria-labelledby="folio-items-title" className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-line px-6 py-5 bg-slate-50">
          <div>
            <h3 id="folio-items-title" className="font-display text-lg font-black text-slate-950">
              Itemized Charges &amp; Indian GST Breakdown
            </h3>
            <p className="mt-0.5 text-sm text-slate-600 font-medium">Includes statutory SAC codes (996311 accommodation, 996331 F&amp;B)</p>
          </div>
          <span className="rounded-full bg-white border border-slate-300 px-3.5 py-1 text-xs sm:text-sm font-bold text-slate-900">
            {folio.items.length} items
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-line bg-slate-100/90 font-black uppercase tracking-wider text-slate-800 text-xs">
              <tr>
                <th className="px-5 py-4">Description</th>
                <th className="px-5 py-4">SAC / Category</th>
                <th className="px-5 py-4">Qty</th>
                <th className="px-5 py-4">Rate</th>
                <th className="px-5 py-4">CGST</th>
                <th className="px-5 py-4">SGST</th>
                <th className="px-5 py-4">IGST</th>
                <th className="px-5 py-4 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm sm:text-[15px]">
              {folio.items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-950">{item.description}</td>
                  <td className="px-5 py-4 text-slate-700">
                    <span className="font-mono font-bold text-slate-950">{item.hsnSac}</span> · {item.taxCategoryCode}
                  </td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{item.quantity}</td>
                  <td className="px-5 py-4 font-semibold text-slate-900">{money(item.unitPrice, currency)}</td>
                  <td className="px-5 py-4 text-slate-700 font-medium">{item.cgstAmount > 0 ? money(item.cgstAmount, currency) : '—'}</td>
                  <td className="px-5 py-4 text-slate-700 font-medium">{item.sgstAmount > 0 ? money(item.sgstAmount, currency) : '—'}</td>
                  <td className="px-5 py-4 text-slate-700 font-medium">{item.igstAmount > 0 ? money(item.igstAmount, currency) : '—'}</td>
                  <td className="px-5 py-4 text-right font-black text-slate-950">{money(item.lineTotal, currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Action Panels: Add Charge, Collect Payment, Issue Invoice */}
      {!readOnly && (
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {/* 1. Add Charge Panel */}
          <form action={addFolioCharge} className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-4">
            <input type="hidden" name="folioId" value={folio.id} />
            <input type="hidden" name="reservationId" value={reservation.id} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-lagoon-dark">Point of Sale &amp; Services</p>
              <h4 className="text-sm font-semibold text-ink">Post New Charge</h4>
              <p className="text-xs text-muted">Post F&amp;B, Laundry, Minibar, or Extra Bed</p>
            </div>

            <label className="block text-xs font-medium text-ink">
              Service Category
              <select name="category" defaultValue="FNB_ROOM_SERVICE" className={`${inputCls} mt-1.5`}>
                <option value="ACCOMMODATION">Accommodation (SAC 996311 - 12%/18% GST)</option>
                <option value="FNB_ROOM_SERVICE">Room Service (SAC 996331 - 5% GST)</option>
                <option value="FNB_REST">Restaurant Dining (SAC 996331 - 5% GST)</option>
                <option value="LAUNDRY">Guest Laundry (SAC 9997 - 18% GST)</option>
                <option value="SPA">Spa &amp; Wellness (SAC 999721 - 18% GST)</option>
                <option value="OTHER">Incidentals / Other (18% GST)</option>
              </select>
            </label>

            <label className="block text-xs font-medium text-ink">
              Item Description
              <input name="description" required placeholder="e.g. Club Sandwich &amp; Cold Beverage" className={`${inputCls} mt-1.5`} />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-ink">
                Quantity
                <input name="quantity" type="number" step="1" min="1" max="100" defaultValue="1" required className={`${inputCls} mt-1.5`} />
              </label>
              <label className="block text-xs font-medium text-ink">
                Unit Price (₹)
                <input name="unitPrice" type="number" step="0.01" min="0" required placeholder="0.00" className={`${inputCls} mt-1.5`} />
              </label>
            </div>

            <label className="flex items-center gap-2 text-xs text-ink">
              <input name="isInterstate" type="checkbox" className="h-4 w-4 accent-[hsl(var(--accent))]" />
              Inter-state guest (apply IGST instead of CGST+SGST)
            </label>

            <FormSubmit className={`${btnCls} w-full`} pendingLabel="Posting charge…">
              Post charge to folio
            </FormSubmit>
          </form>

          {/* 2. Collect Payment Panel */}
          <form action={collectFolioPayment} className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-4">
            <input type="hidden" name="folioId" value={folio.id} />
            <input type="hidden" name="reservationId" value={reservation.id} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-lagoon-dark">Cashiering &amp; Settlement</p>
              <h4 className="text-sm font-semibold text-ink">Collect Payment</h4>
              <p className="text-xs text-muted">Supports UPI, Card, Cash, and City Ledger</p>
            </div>

            <label className="block text-xs font-medium text-ink">
              Payment Method
              <select
                name="method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className={`${inputCls} mt-1.5`}
              >
                <option value="cash">Cash (INR)</option>
                <option value="upi">UPI Dynamic QR / VPA</option>
                <option value="card">Credit / Debit Card (EDC Swipe)</option>
                <option value="bank_transfer">NEFT / RTGS Bank Transfer</option>
                <option value="corporate_ledger">Corporate Direct Billing (City Ledger)</option>
              </select>
            </label>

            <label className="block text-xs font-medium text-ink">
              Amount (₹)
              <input
                name="amount"
                type="number"
                step="0.01"
                min="1"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                required
                className={`${inputCls} mt-1.5`}
              />
            </label>

            {/* Indian Statutory Cash Warning Banner */}
            {paymentMethod === 'cash' && (
              <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs leading-5 text-ink space-y-1">
                <p className="font-semibold text-amber-900">Statutory Cash Limits (India):</p>
                <p>• Max single cash transaction is ₹1,99,999 (Sec 269ST). ₹2L+ must be paid via UPI/Card.</p>
                <p>• Cash &gt; ₹50,000 requires PAN card collection (Rule 114B).</p>
              </div>
            )}

            {paymentMethod === 'cash' && paymentAmount > 50000 && (
              <label className="block text-xs font-medium text-danger">
                Guest PAN Card Number <span className="font-bold">*</span>
                <input
                  name="panNumber"
                  required
                  maxLength={10}
                  placeholder="e.g. ABCDE1234F"
                  className={`${inputCls} mt-1.5 uppercase font-mono`}
                />
              </label>
            )}

            <label className="block text-xs font-medium text-ink">
              Reference / Transaction ID
              <input name="reference" placeholder="e.g. UPI Ref / Card Last 4 digits" className={`${inputCls} mt-1.5`} />
            </label>

            <FormSubmit className={`${btnCls} w-full`} pendingLabel="Recording payment…">
              Collect {money(paymentAmount, currency)}
            </FormSubmit>
          </form>

          {/* 3. Issue GST Tax Invoice Panel */}
          <form action={issueInvoice} className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-4">
            <input type="hidden" name="folioId" value={folio.id} />
            <input type="hidden" name="reservationId" value={reservation.id} />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-lagoon-dark">GST E-Invoicing</p>
              <h4 className="text-sm font-semibold text-ink">Issue Tax Invoice</h4>
              <p className="text-xs text-muted">Generate 16-character statutory invoice with IRN</p>
            </div>

            <label className="block text-xs font-medium text-ink">
              Invoice Category
              <select
                name="invoiceType"
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value)}
                className={`${inputCls} mt-1.5`}
              >
                <option value="B2C">B2C (Individual Guest)</option>
                <option value="B2B">B2B (Corporate / Company GSTIN)</option>
              </select>
            </label>

            {invoiceType === 'B2B' && (
              <>
                <label className="block text-xs font-medium text-ink">
                  Company GSTIN (15 characters) <span className="text-danger">*</span>
                  <input
                    name="guestGstin"
                    required
                    maxLength={15}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    className={`${inputCls} mt-1.5 uppercase font-mono`}
                  />
                </label>
                <label className="block text-xs font-medium text-ink">
                  Company Legal Name <span className="text-danger">*</span>
                  <input
                    name="guestCompanyName"
                    required
                    placeholder="e.g. Tata Consultancy Services Ltd"
                    className={`${inputCls} mt-1.5`}
                  />
                </label>
              </>
            )}

            <label className="block text-xs font-medium text-ink">
              Place of Supply (State Code)
              <input
                name="placeOfSupplyStateCode"
                defaultValue="27"
                maxLength={2}
                className={`${inputCls} mt-1.5 font-mono`}
              />
              <span className="text-[10px] text-muted">27 = Maharashtra, 29 = Karnataka, 07 = Delhi</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-ink">
              <input name="isInterstate" type="checkbox" className="h-4 w-4 accent-[hsl(var(--accent))]" />
              Inter-state billing (IGST)
            </label>

            <FormSubmit className={`${btnCls} w-full`} pendingLabel="Issuing GST invoice…">
              Generate Tax Invoice &amp; IRN
            </FormSubmit>
          </form>
        </div>
      )}

      {/* Payments History & Issued Invoices */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Payments History */}
        <section className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-ink">Payment History</h4>
          {folio.payments.length === 0 ? (
            <p className="text-xs text-muted">No payments recorded for this folio yet.</p>
          ) : (
            <div className="divide-y divide-line">
              {folio.payments.map((p) => (
                <div key={p.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-semibold uppercase text-ink">{p.method.replace('_', ' ')}</p>
                    <p className="text-[10px] text-muted">{new Date(p.createdAt).toLocaleString('en-IN')}</p>
                    {p.panNumber && <p className="font-mono text-[10px] text-danger">PAN: {p.panNumber}</p>}
                    {p.reference && <p className="text-[10px] text-muted">Ref: {p.reference}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-emerald-700">{money(p.amount, currency)}</p>
                    <span className="rounded bg-success/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 uppercase">
                      {p.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Issued Tax Invoices */}
        <section className="rounded-xl border border-line bg-surface p-5 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-ink">Statutory GST Invoices Issued</h4>
          {folio.invoices.length === 0 ? (
            <p className="text-xs text-muted">No tax invoice generated yet. Use the panel above to issue.</p>
          ) : (
            <div className="space-y-3">
              {folio.invoices.map((inv) => (
                <div key={inv.id} className="rounded-lg border border-line bg-ground/50 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-lagoon-dark">{inv.invoiceNumber}</span>
                    <span className="rounded bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-lagoon-dark">
                      {inv.invoiceType}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted text-[11px]">
                    <span>FY: {inv.financialYear}</span>
                    <span className="font-semibold text-ink">{money(inv.grandTotal, currency)}</span>
                  </div>
                  {inv.irnHash && (
                    <p className="truncate font-mono text-[9px] text-muted" title={inv.irnHash}>
                      IRN: {inv.irnHash}
                    </p>
                  )}
                  {inv.signedQrCode && (
                    <div className="pt-1 text-[10px] text-emerald-700 font-semibold flex items-center gap-1">
                      <span>✓ E-Invoice Signed QR Ready</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function money(amount: number | null | undefined, currency = 'INR') {
  const safe = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', maximumFractionDigits: 2 }).format(safe);
}
