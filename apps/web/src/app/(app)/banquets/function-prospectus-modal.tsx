'use client';

export interface FunctionProspectusData {
  hotelName: string;
  bookingNumber: string;
  eventName: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string | null;
  venueName: string;
  venueType: string;
  eventDate: string;
  slot: string;
  paxCount: number;
  menuPackage: string;
  ratePerPax: number;
  hallRental: number;
  decorAvCharges: number;
  totalAmount: number;
  advancePaid: number;
  balanceDue: number;
  status: string;
  specialInstructions: string | null;
  venueAmenities: string[];
  generatedAt: string;
}

export function FunctionProspectusModal({
  fp,
  onClose,
}: {
  fp: FunctionProspectusData;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col">
        {/* Modal Controls */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">📋</span>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Banquet Event Order (BEO) / Function Prospectus
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 cursor-pointer"
            >
              <span>🖨️ Print BEO</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold px-2 py-1"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable BEO Sheet Body */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1">
          <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 text-slate-900 dark:text-slate-100 font-sans text-xs">
            {/* Header */}
            <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 text-center">
              <h1 className="text-lg font-black uppercase tracking-wider">{fp.hotelName}</h1>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 mt-0.5">
                Function Prospectus &amp; Banquet Event Order (BEO)
              </h2>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                <span>VOUCHER: <strong className="text-slate-900 dark:text-white">{fp.bookingNumber}</strong></span>
                <span>STATUS: <strong className="uppercase text-emerald-600 dark:text-emerald-400">{fp.status}</strong></span>
                <span>PRINTED: {new Date(fp.generatedAt).toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* Event & Client Details Grid */}
            <div className="mt-4 grid grid-cols-2 gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Event Title &amp; Function</p>
                <p className="text-sm font-bold text-slate-950 dark:text-white mt-0.5">{fp.eventName}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Venue: <strong className="text-slate-900 dark:text-white">{fp.venueName}</strong> ({fp.venueType.replace('_', ' ')})
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Event Date: <strong className="text-slate-900 dark:text-white">{new Date(fp.eventDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Slot / Timings: <strong className="text-slate-900 dark:text-white">{fp.slot === 'MORNING' ? 'Morning (9:00 AM - 3:00 PM)' : fp.slot === 'EVENING' ? 'Evening (6:00 PM - 11:30 PM)' : 'Full Day (24 Hours)'}</strong>
                </p>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Host / Client Contact</p>
                <p className="text-sm font-bold text-slate-950 dark:text-white mt-0.5">{fp.clientName}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Phone: <strong className="text-slate-900 dark:text-white font-mono">{fp.clientPhone}</strong>
                </p>
                {fp.clientEmail && (
                  <p className="text-slate-600 dark:text-slate-400">
                    Email: <strong className="text-slate-900 dark:text-white">{fp.clientEmail}</strong>
                  </p>
                )}
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Guaranteed Pax: <strong className="text-slate-900 dark:text-white font-bold">{fp.paxCount} Guests</strong>
                </p>
              </div>
            </div>

            {/* Food & Beverage Specifications */}
            <div className="mt-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                🍽️ F&amp;B Menu Package &amp; Kitchen Requirements
              </h3>
              <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 p-3 border border-slate-200/60 dark:border-slate-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Selected Catering Package:</span>
                  <span className="font-bold text-slate-950 dark:text-white">{fp.menuPackage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600 dark:text-slate-400">Plate Rate (₹ per Pax):</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">₹{fp.ratePerPax.toLocaleString('en-IN')}</span>
                </div>
                {fp.specialInstructions && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400">Special Chef &amp; Service Instructions:</span>
                    <p className="mt-0.5 text-slate-800 dark:text-slate-200 italic">{fp.specialInstructions}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Venue Setup & Technical Facilities */}
            <div className="mt-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                🎙️ Venue Amenities &amp; Technical Setup
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {fp.venueAmenities.map((amenity, idx) => (
                  <span key={idx} className="rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    ✓ {amenity}
                  </span>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="mt-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <h3 className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300">
                💰 Financial Accounts &amp; Billing
              </h3>
              <div className="mt-2 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Catering Charges ({fp.paxCount} Pax × ₹{fp.ratePerPax}):</span>
                  <span>₹{(fp.paxCount * fp.ratePerPax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Venue Hall Rental:</span>
                  <span>₹{fp.hallRental.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Decor, Lighting &amp; Audio-Visual Add-ons:</span>
                  <span>₹{fp.decorAvCharges.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-1.5 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                  <span>TOTAL ESTIMATED CONTRACT AMOUNT:</span>
                  <span>₹{fp.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Less Advance Deposit Received:</span>
                  <span>- ₹{fp.advancePaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-slate-300 dark:border-slate-700 pt-1.5 flex justify-between font-black text-sm text-rose-600 dark:text-rose-400">
                  <span>OUTSTANDING BALANCE DUE AT SETTLEMENT:</span>
                  <span>₹{fp.balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Signatures & Departmental Approvals */}
            <div className="mt-8 grid grid-cols-4 gap-4 text-center text-[10px] font-mono">
              <div>
                <div className="border-b border-slate-400 pb-8"></div>
                <p className="mt-1 font-bold">Banquet Sales Manager</p>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-8"></div>
                <p className="mt-1 font-bold">Executive Chef</p>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-8"></div>
                <p className="mt-1 font-bold">Banquet Operations Captain</p>
              </div>
              <div>
                <div className="border-b border-slate-400 pb-8"></div>
                <p className="mt-1 font-bold">Host / Client Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
