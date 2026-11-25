'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCorporateAccountAction } from './actions';

export interface CorporateAccount {
  id: string;
  companyName: string;
  gstin: string | null;
  panNumber: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  creditLimit: number;
  currentBalance: number;
  creditPeriodDays: number;
  isActive: boolean;
}

export function CorporateClient({ initialAccounts }: { initialAccounts: CorporateAccount[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState<CorporateAccount[]>(initialAccounts);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [companyName, setCompanyName] = useState('');
  const [gstin, setGstin] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [creditLimit, setCreditLimit] = useState('200000');
  const [creditPeriodDays, setCreditPeriodDays] = useState('30');
  const [billingAddress, setBillingAddress] = useState('');

  const filtered = accounts.filter((a) => {
    return (
      a.companyName.toLowerCase().includes(search.toLowerCase()) ||
      (a.gstin && a.gstin.toLowerCase().includes(search.toLowerCase())) ||
      (a.contactPerson && a.contactPerson.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const totalCreditExtended = accounts.reduce((sum, a) => sum + a.creditLimit, 0);
  const totalOutstandingBalance = accounts.reduce((sum, a) => sum + a.currentBalance, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await createCorporateAccountAction({
        companyName: companyName.trim(),
        gstin: gstin.trim().toUpperCase() || undefined,
        panNumber: panNumber.trim().toUpperCase() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        creditLimit: parseFloat(creditLimit) || 0,
        creditPeriodDays: parseInt(creditPeriodDays) || 30,
        billingAddress: { address: billingAddress.trim() },
      });

      if (!res.ok) throw new Error(res.error || 'Failed to create corporate account');

      setIsModalOpen(false);
      setCompanyName('');
      setGstin('');
      setPanNumber('');
      setContactPerson('');
      setContactPhone('');
      setBillingAddress('');
      router.refresh();
      if (res.account) {
        setAccounts([...accounts, res.account]);
      }
    } catch (err: any) {
      setError(err.message || 'Error saving corporate account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">💼</span>
            <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Corporate Accounts &amp; Travel Agent City Ledger
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Manage corporate B2B clients, travel agencies, Bill-to-Company (BTC) credit limits, and GST invoicing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-slate-800 dark:bg-teal-500 dark:text-slate-950 dark:hover:bg-teal-400 cursor-pointer transition-all active:scale-[0.98]"
          >
            <span>+ Add Corporate / Travel Agency</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Corporate Clients</span>
          <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{accounts.length} Companies</p>
          <p className="mt-1 text-[11px] text-slate-500">Corporate &amp; OTA travel agencies</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Credit Extended</span>
          <p className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400">
            ₹{totalCreditExtended.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Total sanctioned credit ceiling</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">City Ledger Outstanding</span>
          <p className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">
            ₹{totalOutstandingBalance.toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Accounts receivable pending collection</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Available Headroom</span>
          <p className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">
            ₹{(totalCreditExtended - totalOutstandingBalance).toLocaleString('en-IN')}
          </p>
          <p className="mt-1 text-[11px] text-slate-500">Remaining credit across all clients</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <input
          type="text"
          placeholder="Search by company name, GSTIN, or contact person…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
        />
      </div>

      {/* Accounts Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                <th className="px-4 py-3">Company / Travel Agency</th>
                <th className="px-4 py-3">GSTIN / PAN</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3 text-right">Credit Limit (₹)</th>
                <th className="px-4 py-3 text-right">City Ledger Balance (₹)</th>
                <th className="px-4 py-3 text-right">Available Credit (₹)</th>
                <th className="px-4 py-3 text-center">Credit Days</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/60 text-xs dark:divide-slate-800">
              {filtered.map((a) => {
                const available = a.creditLimit - a.currentBalance;
                return (
                  <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                      {a.companyName}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                      <div>GST: {a.gstin || 'Unregistered'}</div>
                      {a.panNumber && <div>PAN: {a.panNumber}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800 dark:text-slate-200">{a.contactPerson || '—'}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{a.contactPhone}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₹{a.creditLimit.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                      ₹{a.currentBalance.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{available.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-semibold">
                      {a.creditPeriodDays} Days
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                        Active
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    No corporate accounts or travel agencies match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Corporate Account Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>🏢</span> Add Corporate Client / Travel Agency
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-800">
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Company / Agency Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Infosys Ltd, Tata Consultancy Services, MakeMyTrip Corporate"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Corporate GSTIN (15 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 27AABCT3518Q1ZV"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Company PAN (10 Digits)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="e.g. AABCT3518Q"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajiv Menon"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Work Email
                  </label>
                  <input
                    type="email"
                    placeholder="travel@company.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Phone / Mobile
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98450 12345"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Credit Limit (₹ INR) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    required
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Payment Terms / Credit Days *
                  </label>
                  <select
                    value={creditPeriodDays}
                    onChange={(e) => setCreditPeriodDays(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                  >
                    <option value="7">7 Days</option>
                    <option value="15">15 Days</option>
                    <option value="30">30 Days (Net 30)</option>
                    <option value="45">45 Days</option>
                    <option value="60">60 Days (Net 60)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Billing Registered Address
                </label>
                <textarea
                  rows={2}
                  placeholder="Official tax registered address for GST B2B tax invoice"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 focus:border-slate-900 focus:outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                />
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
                  {loading ? 'Saving…' : 'Create Corporate Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
