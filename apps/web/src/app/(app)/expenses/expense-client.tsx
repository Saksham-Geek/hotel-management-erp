'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CustomDropdown, type DropdownOption } from '@/components/ui';
import {
  createExpenseAction,
  createVendorAction,
  createCommonExpenseAction,
} from './actions';

export interface ExpenseVoucher {
  id: string;
  voucherNumber: string;
  category: string;
  amount: number;
  paymentMode: string;
  paidTo: string;
  invoiceRef: string | null;
  receiptUrl: string | null;
  notes: string | null;
  loggedBy: string;
  expenseDate: string;
  createdAt: string;
}

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  icon: string;
  badgeColor: string;
  description: string | null;
  isSystem: boolean;
}

export interface HotelVendor {
  id: string;
  name: string;
  category: string;
  contactPerson: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  paymentTerms: string;
  isActive: boolean;
}

export interface CommonExpenseItem {
  id: string;
  name: string;
  categoryCode: string;
  defaultAmount: number;
  defaultVendorName: string | null;
  defaultPaymentMode: string;
  description: string | null;
  isActive: boolean;
}

export interface CashSummary {
  today: {
    totalCashIn: number;
    totalCashOut: number;
    netDrawerCash: number;
    voucherCount: number;
  };
  categoryBreakdownMonth: {
    category: string;
    total: number;
    count: number;
  }[];
}

const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: '1', code: 'DIESEL_GENSET', name: 'GenSet Diesel & Fuel', icon: '⛽', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300', description: null, isSystem: true },
  { id: '2', code: 'KITCHEN_PERISHABLES', name: 'Milk, Bread & Perishables', icon: '🥛', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300', description: null, isSystem: true },
  { id: '3', code: 'GUEST_LAUNDRY', name: 'Outsourced Guest Laundry', icon: '🧺', badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300', description: null, isSystem: true },
  { id: '4', code: 'PROPERTY_REPAIRS', name: 'Plumbing & Electrical Spares', icon: '🔧', badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300', description: null, isSystem: true },
  { id: '5', code: 'STAFF_WELFARE', name: 'Staff Tea & Welfare', icon: '☕', badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300', description: null, isSystem: true },
  { id: '6', code: 'FRONT_DESK_SUPPLIES', name: 'Stationery & Key Sleeves', icon: '📝', badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300', description: null, isSystem: true },
  { id: '7', code: 'MUNICIPAL_UTILITIES', name: 'Water Tanker & Municipal', icon: '💧', badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300', description: null, isSystem: true },
  { id: '8', code: 'OTHER', name: 'General Petty Cash Sundry', icon: '📦', badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300', description: null, isSystem: true },
];

export function ExpenseClient({
  initialExpenses,
  initialSummary,
  initialCategories = [],
  initialVendors = [],
  initialCommonExpenses = [],
}: {
  initialExpenses: ExpenseVoucher[];
  initialSummary: CashSummary;
  initialCategories?: ExpenseCategory[];
  initialVendors?: HotelVendor[];
  initialCommonExpenses?: CommonExpenseItem[];
}) {
  const router = useRouter();
  const [expenses, setExpenses] = useState<ExpenseVoucher[]>(initialExpenses);
  const [summary] = useState<CashSummary>(initialSummary);
  const [categories] = useState<ExpenseCategory[]>(
    initialCategories.length > 0 ? initialCategories : DEFAULT_CATEGORIES,
  );
  const [vendors, setVendors] = useState<HotelVendor[]>(initialVendors);
  const [commonExpenses, setCommonExpenses] = useState<CommonExpenseItem[]>(initialCommonExpenses);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShiftHandoverOpen, setIsShiftHandoverOpen] = useState(false);
  const [isQuickAddVendor, setIsQuickAddVendor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedCommonItemId, setSelectedCommonItemId] = useState('');
  const [formCategory, setFormCategory] = useState(categories[0]?.code || 'DIESEL_GENSET');
  const [formAmount, setFormAmount] = useState('');
  const [formPaymentMode, setFormPaymentMode] = useState('CASH_DRAWER');
  const [formPaidTo, setFormPaidTo] = useState('');
  const [formInvoiceRef, setFormInvoiceRef] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saveAsCommonItem, setSaveAsCommonItem] = useState(false);
  const [commonItemName, setCommonItemName] = useState('');

  // Quick Add Vendor State
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [newVendorGstin, setNewVendorGstin] = useState('');

  // Dropdown options
  const categoryFilterOptions: DropdownOption[] = [
    { value: 'ALL', label: 'All Categories' },
    ...categories.map((c) => ({
      value: c.code,
      label: c.name,
      icon: <span>{c.icon || '🏷️'}</span>,
    })),
  ];

  const categorySelectOptions: DropdownOption[] = categories.map((c) => ({
    value: c.code,
    label: c.name,
    icon: <span>{c.icon || '🏷️'}</span>,
  }));

  const paymentModeOptions: DropdownOption[] = [
    { value: 'CASH_DRAWER', label: 'Front Desk Cash Drawer', icon: <span>💵</span>, badge: 'Drawer' },
    { value: 'UPI', label: 'Hotel Manager UPI', icon: <span>📱</span>, badge: 'UPI' },
    { value: 'BANK_TRANSFER', label: 'Direct Net Banking', icon: <span>🏦</span>, badge: 'NEFT/IMPS' },
    { value: 'COMPANY_CARD', label: 'Company Credit Card', icon: <span>💳</span>, badge: 'Card' },
  ];

  const commonExpenseOptions: DropdownOption[] = [
    { value: '', label: '⚡ Custom One-Off Expense (Manual Entry)' },
    ...commonExpenses.map((item) => {
      const cat = categories.find((c) => c.code === item.categoryCode);
      return {
        value: item.id,
        label: `${item.name} — ₹${item.defaultAmount}`,
        icon: <span>{cat?.icon || '🏷️'}</span>,
        badge: cat?.name || item.categoryCode,
      };
    }),
  ];

  const handleSelectCommonExpense = (itemId: string) => {
    setSelectedCommonItemId(itemId);
    if (!itemId) return;
    const match = commonExpenses.find((ci) => ci.id === itemId);
    if (match) {
      setFormCategory(match.categoryCode);
      if (match.defaultAmount > 0) setFormAmount(String(match.defaultAmount));
      if (match.defaultVendorName) setFormPaidTo(match.defaultVendorName);
      if (match.defaultPaymentMode) setFormPaymentMode(match.defaultPaymentMode);
      if (match.description) setFormNotes(match.description);
    }
  };

  const getCategoryMeta = (code: string) => {
    const found = categories.find((c) => c.code === code);
    if (found) {
      return {
        label: found.name,
        icon: found.icon || '📦',
        badge: found.badgeColor || 'bg-slate-100 text-slate-800',
      };
    }
    return { label: code, icon: '📦', badge: 'bg-slate-100 text-slate-800' };
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesCategory = selectedCategory === 'ALL' || e.category === selectedCategory;
    const matchesSearch =
      e.voucherNumber.toLowerCase().includes(search.toLowerCase()) ||
      e.paidTo.toLowerCase().includes(search.toLowerCase()) ||
      (e.notes && e.notes.toLowerCase().includes(search.toLowerCase())) ||
      (e.invoiceRef && e.invoiceRef.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await createExpenseAction({
        category: formCategory,
        amount: parseFloat(formAmount),
        paymentMode: formPaymentMode,
        paidTo: formPaidTo.trim(),
        invoiceRef: formInvoiceRef.trim() || undefined,
        notes: formNotes.trim() || undefined,
      });

      if (!res.ok) {
        throw new Error(res.error || 'Failed to log expense voucher.');
      }

      // If user opted to save this recurring expense into common expenses catalog
      if (saveAsCommonItem) {
        const itemName = commonItemName.trim() || formPaidTo.trim();
        if (itemName) {
          createCommonExpenseAction({
            name: itemName,
            categoryCode: formCategory,
            defaultAmount: parseFloat(formAmount) || 0,
            defaultVendorName: formPaidTo.trim() || undefined,
            defaultPaymentMode: formPaymentMode,
            description: formNotes.trim() || undefined,
          }).then((r) => {
            if (r.ok && r.item) {
              setCommonExpenses((prev) => [...prev, r.item]);
            }
          });
        }
      }

      setIsModalOpen(false);
      setSelectedCommonItemId('');
      setFormAmount('');
      setFormPaidTo('');
      setFormInvoiceRef('');
      setFormNotes('');
      setSaveAsCommonItem(false);
      setCommonItemName('');
      router.refresh();
      if (res.voucher) {
        setExpenses([res.voucher, ...expenses]);
      }
    } catch (err: any) {
      setError(err.message || 'Error logging voucher');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;
    setLoading(true);
    try {
      const res = await createVendorAction({
        name: newVendorName.trim(),
        phone: newVendorPhone.trim() || undefined,
        gstin: newVendorGstin.trim().toUpperCase() || undefined,
        category: categories.find((c) => c.code === formCategory)?.name || 'General Supplier',
      });
      if (res.ok && res.vendor) {
        setVendors([res.vendor, ...vendors]);
        setFormPaidTo(res.vendor.name);
        setIsQuickAddVendor(false);
        setNewVendorName('');
        setNewVendorPhone('');
        setNewVendorGstin('');
      } else {
        alert(res.error || 'Failed to add vendor');
      }
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Voucher Number', 'Date', 'Category', 'Amount (INR)', 'Payment Mode', 'Paid To', 'Invoice Ref', 'Logged By', 'Notes'];
    const rows = filteredExpenses.map((e) => [
      e.voucherNumber,
      e.expenseDate,
      getCategoryMeta(e.category).label,
      e.amount,
      e.paymentMode,
      `"${e.paidTo.replace(/"/g, '""')}"`,
      `"${(e.invoiceRef || '').replace(/"/g, '""')}"`,
      `"${e.loggedBy.replace(/"/g, '""')}"`,
      `"${(e.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `hotel_petty_cash_expenses_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💵</span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Front Desk Petty Cash &amp; Expense Ledger
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Log physical cash drawer payouts for generator diesel, kitchen groceries, and guest laundry to eliminate cash leakages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/settings?tab=expenses"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
          >
            <span>⚙️ Manage Categories &amp; Vendors</span>
          </Link>
          <button
            type="button"
            onClick={() => setIsShiftHandoverOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
          >
            <span>🖨️ Shift Handover</span>
          </button>
          <button
            type="button"
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 cursor-pointer"
          >
            <span>📥 CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span>+ Log Expense Voucher</span>
          </button>
        </div>
      </div>

      {/* Cash Drawer Reconciliation Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cash Collected Today</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-xs text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">
              📥
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{summary.today.totalCashIn.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">From guest folios &amp; walk-in cash payments</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Cash Payouts Today</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-xs text-rose-800 dark:bg-rose-950/60 dark:text-rose-400 font-bold">
              📤
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600 dark:text-rose-400">
            ₹{summary.today.totalCashOut.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">{summary.today.voucherCount} expense vouchers paid from drawer</p>
        </div>

        <div className="rounded-2xl border-2 border-slate-900 bg-slate-950 p-4 text-white shadow-md dark:border-teal-500/40 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">Expected Physical Drawer Cash</span>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-xs text-white font-bold">
              💵
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-teal-300">
            ₹{summary.today.netDrawerCash.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">Cash In minus Cash Payouts</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Approved Vendors &amp; Categories</span>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{vendors.length} Vendors</p>
              <p className="text-[11px] text-slate-500">{categories.length} Categories configured</p>
            </div>
            <Link
              href="/settings?tab=expenses"
              className="text-xs font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 underline"
            >
              Configure ›
            </Link>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by voucher #, payee vendor, invoice ref or notes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 min-w-[220px]">
          <span className="text-xs font-semibold text-slate-500 shrink-0">Category:</span>
          <div className="flex-1">
            <CustomDropdown
              size="sm"
              options={categoryFilterOptions}
              value={selectedCategory}
              onChange={setSelectedCategory}
            />
          </div>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                <th className="px-4 py-3">Voucher #</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Payee / Vendor</th>
                <th className="px-4 py-3">Invoice Ref</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3 text-right">Amount (₹)</th>
                <th className="px-4 py-3">Logged By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-xs dark:divide-slate-800">
              {filteredExpenses.map((e) => {
                const meta = getCategoryMeta(e.category);
                return (
                  <tr key={e.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                      {e.voucherNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(e.expenseDate).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">
                      {e.paidTo}
                      {e.notes && <p className="text-[11px] text-slate-500 mt-0.5 italic">{e.notes}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono">
                      {e.invoiceRef || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {e.paymentMode.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-950 dark:text-white">
                      ₹{e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {e.loggedBy}
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    No petty cash expense vouchers match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Expense Voucher Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🧾</span> Log Front Desk Expense Voucher
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setIsQuickAddVendor(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="mt-4 space-y-4">
              {/* Quick-Fill Recurring Expense Item */}
              <div className="rounded-xl border border-teal-500/20 bg-teal-50/40 p-3 dark:bg-teal-950/20">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-extrabold text-teal-900 dark:text-teal-300">
                    ⚡ Quick-Fill Recurring Expense Item
                  </label>
                  {selectedCommonItemId && (
                    <span className="text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-teal-100 dark:bg-teal-900/60 px-2 py-0.5 rounded-full">
                      ✓ Auto-Filled
                    </span>
                  )}
                </div>
                <CustomDropdown
                  placeholder="Choose common expense (Diesel, Milk, Paper rolls...)"
                  options={commonExpenseOptions}
                  value={selectedCommonItemId}
                  onChange={handleSelectCommonExpense}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Expense Category *
                </label>
                <CustomDropdown
                  options={categorySelectOptions}
                  value={formCategory}
                  onChange={setFormCategory}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Amount (₹ INR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 2400"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Disbursed From *
                  </label>
                  <CustomDropdown
                    options={paymentModeOptions}
                    value={formPaymentMode}
                    onChange={setFormPaymentMode}
                  />
                </div>
              </div>

              {/* Vendor Selector with Quick Add */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Paid To / Vendor Name *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsQuickAddVendor(!isQuickAddVendor)}
                    className="text-[11px] font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer"
                  >
                    {isQuickAddVendor ? '✕ Select from list' : '+ Quick Add New Vendor'}
                  </button>
                </div>

                {isQuickAddVendor ? (
                  <div className="mt-2 p-3 rounded-xl border border-teal-500/30 bg-teal-50/50 dark:bg-slate-950 space-y-2">
                    <p className="text-[11px] font-bold text-teal-800 dark:text-teal-300">
                      Register Vendor to Approved List:
                    </p>
                    <input
                      type="text"
                      placeholder="Vendor Legal / Trade Name (e.g. Bharat Petroleum)"
                      value={newVendorName}
                      onChange={(e) => setNewVendorName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="tel"
                        placeholder="Phone (e.g. +91 98210 11223)"
                        value={newVendorPhone}
                        onChange={(e) => setNewVendorPhone(e.target.value)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                      <input
                        type="text"
                        placeholder="GSTIN (Optional)"
                        value={newVendorGstin}
                        onChange={(e) => setNewVendorGstin(e.target.value.toUpperCase())}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleQuickAddVendor}
                      className="w-full rounded-lg bg-teal-600 py-1.5 text-xs font-bold text-white hover:bg-teal-500"
                    >
                      Save &amp; Select Vendor
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5 mt-1.5">
                    <input
                      type="text"
                      list="approved-vendors-list"
                      required
                      placeholder="Type vendor or select from approved list…"
                      value={formPaidTo}
                      onChange={(e) => setFormPaidTo(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                    <datalist id="approved-vendors-list">
                      {vendors.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.category} {v.phone ? `(${v.phone})` : ''}
                        </option>
                      ))}
                    </datalist>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Vendor Bill / Memo # (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BPCL-94821 or MEMO-04"
                  value={formInvoiceRef}
                  onChange={(e) => setFormInvoiceRef(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Notes / Item Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 30L Diesel for backup GenSet during evening load shedding"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              {/* Option to save as recurring expense item */}
              <div className="rounded-xl border border-dashed border-teal-300 dark:border-teal-800/60 p-3 bg-teal-50/30 dark:bg-teal-950/20 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="checkbox"
                    checked={saveAsCommonItem}
                    onChange={(e) => setSaveAsCommonItem(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Save this as a Common Recurring Expense template</span>
                </label>
                {saveAsCommonItem && (
                  <input
                    type="text"
                    placeholder="Template Item Name (e.g. GenSet Diesel 40L, Morning Bread Tray)"
                    value={commonItemName}
                    onChange={(e) => setCommonItemName(e.target.value)}
                    className="w-full rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-xs text-slate-900 dark:border-teal-700 dark:bg-slate-950 dark:text-white"
                  />
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 disabled:opacity-50"
                >
                  {loading ? 'Logging…' : 'Save & Deduct Cash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Shift Handover Cash Sheet Modal */}
      {isShiftHandoverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                🖨️ Daily Shift Cash Drawer Handover Sheet
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950"
                >
                  Print Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setIsShiftHandoverOpen(false)}
                  className="text-slate-400 hover:text-slate-600 text-lg font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Print Area */}
            <div className="mt-4 p-4 border border-slate-200 rounded-xl space-y-4 text-xs font-mono">
              <div className="text-center border-b pb-2">
                <h3 className="font-bold text-sm uppercase">Hotel Front Desk Cash Reconciliation</h3>
                <p className="text-slate-500">Date: {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span>Total Cash Collected from Guests (Folio Cash):</span>
                  <span>+ ₹{summary.today.totalCashIn.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-rose-600">
                  <span>Less Petty Cash Drawer Payouts Today:</span>
                  <span>- ₹{summary.today.totalCashOut.toFixed(2)}</span>
                </div>
                <div className="border-t pt-1 flex justify-between font-black text-sm">
                  <span>NET PHYSICAL CASH IN DRAWER:</span>
                  <span className="text-emerald-600">₹{summary.today.netDrawerCash.toFixed(2)}</span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-bold mb-2">Today&apos;s Disbursed Vouchers:</h4>
                <div className="space-y-1">
                  {expenses.filter(e => e.paymentMode === 'CASH_DRAWER' && e.expenseDate === new Date().toISOString().slice(0, 10)).map(e => (
                    <div key={e.id} className="flex justify-between text-[11px]">
                      <span>{e.voucherNumber} ({e.paidTo} - {getCategoryMeta(e.category).label})</span>
                      <span>₹{e.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 grid grid-cols-2 gap-8 text-center text-[11px] border-t">
                <div>
                  <p className="border-b border-slate-300 pb-8"></p>
                  <p className="mt-1 font-bold">Relieving Staff Signature</p>
                </div>
                <div>
                  <p className="border-b border-slate-300 pb-8"></p>
                  <p className="mt-1 font-bold">Incoming Staff Signature (Cash Received)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
