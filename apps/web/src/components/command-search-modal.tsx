'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface SearchItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Rooms' | 'Help';
  description?: string;
  href: string;
  badge?: string;
  icon: string;
}

const STATIC_ACTIONS: SearchItem[] = [
  { id: 'tape-chart', title: 'Tape Chart (Room Rack Gantt)', category: 'Navigation', href: '/tape-chart', icon: '📅', description: 'Visual multi-day room timeline and drag-to-book' },
  { id: 'reservations', title: 'Reservations & Stays', category: 'Navigation', href: '/reservations', icon: '🛎️', description: 'Guest bookings, walk-ins, and check-in roster' },
  { id: 'billing', title: 'Cashiering & GST Invoices', category: 'Navigation', href: '/billing', icon: '💳', description: 'Folios, Dynamic UPI QR, EDC card terminals' },
  { id: 'housekeeping', title: 'Housekeeping & Attendant Hub', category: 'Navigation', href: '/housekeeping', icon: '🧹', description: '1-tap room turnaround, minibar billing, defect tickets' },
  { id: 'restaurant', title: 'Aura Dine Restaurant POS', category: 'Navigation', href: '/restaurant', icon: '🍽️', description: 'Floor tables, multi-round KOTs, KDS, thermal slips' },
  { id: 'inventory', title: 'Stores & Raw Materials', category: 'Navigation', href: '/inventory', icon: '📦', description: 'GRN stock-in, recipe BOM, automated kitchen depletion' },
  { id: 'income', title: 'Income & General Ledger', category: 'Navigation', href: '/income', icon: '📊', description: 'Owner revenue analytics, Trial Balance, P&L, Balance Sheet' },
  { id: 'compliance', title: 'Police Beat & BoI Form C', category: 'Navigation', href: '/compliance', icon: '⚖️', description: 'Daily police station sheet and foreign guest immigration' },
  { id: 'expenses', title: 'Petty Cash & Expense Ledger', category: 'Navigation', href: '/expenses', icon: '💵', description: 'Front desk cash vouchers, diesel, grocery expenses' },
  { id: 'banquets', title: 'Banquets & Event Spaces', category: 'Navigation', href: '/banquets', icon: '🎉', description: 'Wedding lawns, halls, and Function Prospectus (BEO)' },
  { id: 'keycards', title: 'Key Rack & Door Locks', category: 'Navigation', href: '/keycards', icon: '🔑', description: 'Brass key tags and W3C Web Serial RFID encoder bridge' },
  { id: 'settings', title: 'Settings & Management Hub', category: 'Navigation', href: '/settings', icon: '⚙️', description: '20 configuration modules with full CRUD' },
  { id: 'night-audit', title: 'Night Audit & Day Close', category: 'Navigation', href: '/night-audit', icon: '🌙', description: 'Automated 02:00 AM midnight rollover and room postings' },
  { id: 'action-walkin', title: 'Quick Action: Check-in New Walk-In Guest', category: 'Actions', href: '/reservations?new=walkin', icon: '⚡', description: 'Create walk-in stay with 60-second mobile KYC' },
  { id: 'action-kot', title: 'Quick Action: Fire New Kitchen KOT', category: 'Actions', href: '/restaurant', icon: '🔥', description: 'Select dining table and punch multi-round food order' },
  { id: 'action-voucher', title: 'Quick Action: Log Petty Cash Voucher', category: 'Actions', href: '/expenses?action=new', icon: '📝', description: 'Record cash payment for diesel or staff tea' },
  { id: 'action-audit', title: 'Quick Action: View Auditor Balance Sheet', category: 'Actions', href: '/income?tab=general_ledger', icon: '📑', description: 'Direct double-entry financial statements for CA' },
];

export function CommandSearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return STATIC_ACTIONS;
    const q = query.toLowerCase();
    return STATIC_ACTIONS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query]);

  // Keyboard navigation inside modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredItems[selectedIndex];
        if (selected) {
          router.push(selected.href);
          onClose();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
          <span className="text-lg">🔍</span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a page, guest, room #, or action (e.g. 'walk-in', '101', 'billing')..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm font-medium text-slate-900 dark:text-white outline-none placeholder:text-slate-400"
          />
          <kbd className="rounded bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching pages or actions found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    router.push(item.href);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                    isSelected ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-medium' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xl shrink-0">{item.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.title}</p>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 shrink-0 ml-2">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span className="font-semibold text-slate-900 dark:text-white">Enterprise Global Hub</span>
        </div>
      </div>
    </div>
  );
}
