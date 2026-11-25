'use client';

import { useState, useRef, useEffect } from 'react';

const JARGON_DICTIONARY: Record<string, { term: string; definition: string; practicalTip: string }> = {
  revpar: {
    term: 'RevPAR (Revenue Per Available Room)',
    definition: 'Total room revenue divided by total rooms available in the hotel (sold + unsold).',
    practicalTip: 'Measures how well you fill rooms at healthy tariffs. Higher RevPAR = more profit.',
  },
  adr: {
    term: 'ADR (Average Daily Rate)',
    definition: 'The average rental revenue earned per occupied/sold room per day.',
    practicalTip: 'Formula: Total Room Revenue ÷ Total Rooms Sold.',
  },
  usali: {
    term: 'USALI (Uniform System of Accounts for the Lodging Industry)',
    definition: 'The global 5-star standard format for classifying hotel revenue by department (Rooms, F&B, Banquets, Spa).',
    practicalTip: 'Separates operational room income from restaurant dining so you know which department makes money.',
  },
  grn: {
    term: 'GRN (Goods Receipt Note)',
    definition: 'Official proof that raw materials (milk, rice, vegetables, diesel) were physically delivered by a vendor.',
    practicalTip: 'Always verify quantity and supplier bill number before clicking Stock In.',
  },
  bom: {
    term: 'Recipe BOM (Bill of Materials)',
    definition: 'The precise ingredients and raw quantities needed to prepare 1 serving of a dish.',
    practicalTip: 'Used to calculate theoretical food cost and automatically deduct ingredients on KOT punch.',
  },
  kot: {
    term: 'KOT (Kitchen Order Ticket)',
    definition: 'A printed or digital ticket sent directly to kitchen chefs showing table # and dishes ordered.',
    practicalTip: 'Captains can fire multiple rounds (Starters, Mains, Desserts) while keeping 1 master table bill.',
  },
  kds: {
    term: 'KDS (Kitchen Display System)',
    definition: 'A touch tablet in the kitchen showing live cooking orders with timers instead of paper chits.',
    practicalTip: 'Chefs tap "Ready" when dishes are cooked to alert floor waitstaff.',
  },
  sac996311: {
    term: 'SAC 996311 (Hotel Accommodation)',
    definition: 'Indian GST service accounting code for room lodging and guest stay tariffs.',
    practicalTip: 'Mandatory on all room stay invoices (12% if tariff ≤ ₹7.5k, 18% if > ₹7.5k).',
  },
  sac996331: {
    term: 'SAC 996331 (Restaurant & F&B Dining)',
    definition: 'Indian GST service code for food & beverage served in restaurants or in-room dining.',
    practicalTip: 'Charged at 5% GST (2.5% CGST + 2.5% SGST) without Input Tax Credit (ITC).',
  },
  section269st: {
    term: 'Section 269ST (Income Tax Act)',
    definition: 'Indian statutory law prohibiting any person from accepting cash of ₹2,00,000 or more in a single day.',
    practicalTip: 'The PMS automatically blocks cash payments of ₹2 Lakh or more to avoid 100% tax penalties.',
  },
  rule114b: {
    term: 'Rule 114B (PAN Requirement)',
    definition: 'Mandates collecting guest PAN for any hotel or restaurant cash bill exceeding ₹50,000.',
    practicalTip: 'Enter the guest’s 10-digit PAN before settling cash amounts over ₹50k.',
  },
  btc: {
    term: 'BTC (Bill to Company / City Ledger)',
    definition: 'Direct billing where a corporate company pays the guest’s room bill on credit (30/60/90 days).',
    practicalTip: 'Personal extras (minibar, personal bar) should be routed to a separate personal folio.',
  },
  coa: {
    term: 'Chart of Accounts (COA)',
    definition: 'The organized list of all financial ledger heads (Assets, Liabilities, Equity, Revenue, Expenses).',
    practicalTip: 'Forms the backbone of your automatic double-entry Trial Balance and Balance Sheet.',
  },
  ari: {
    term: 'ARI (Availability, Rates & Inventory)',
    definition: 'The two-way live data stream between the PMS and online travel agents (MakeMyTrip, Booking.com, Agoda).',
    practicalTip: 'Stops double-booking by updating room availability instantly across all booking channels.',
  },
};

export function HelpTooltip({
  termKey,
  label,
  children,
}: {
  termKey: keyof typeof JARGON_DICTIONARY | string;
  label?: string;
  children?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const entry = JARGON_DICTIONARY[termKey.toLowerCase()] || {
    term: label || termKey.toUpperCase(),
    definition: 'Hospitality operational term.',
    practicalTip: 'Used in daily front desk and hotel management workflows.',
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <span ref={containerRef} className="relative inline-flex items-center gap-1">
      {children || <span>{label || entry.term}</span>}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        aria-label={`Explain ${entry.term}`}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200/80 hover:bg-indigo-100 hover:text-indigo-600 text-slate-600 text-[10px] font-bold font-mono transition-colors"
      >
        ?
      </button>

      {isOpen && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 z-50 rounded-xl border border-slate-700 bg-slate-900 p-3 text-left shadow-xl animate-in fade-in zoom-in-95 pointer-events-auto">
          <span className="block text-xs font-bold text-white mb-0.5">{entry.term}</span>
          <span className="block text-[11px] text-slate-300 leading-snug">{entry.definition}</span>
          {entry.practicalTip && (
            <span className="block mt-1.5 pt-1.5 border-t border-slate-800 text-[10px] text-amber-300 font-medium">
              💡 Tip: {entry.practicalTip}
            </span>
          )}
        </span>
      )}
    </span>
  );
}
